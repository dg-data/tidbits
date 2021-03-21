---
title: "Automatic accident mapping with machine learning"
date: 2021-01-31
tags: [NER, automation, machine learning]
titles_from_headings:
  strip_title: false
toc: false
toc_sticky: true
classes: wide
---
Day by day it is easier to apply machine learning in processing any kind of data. Natural Language Processing (NLP) is concerned with the creation of computational models that process and understand natural language. A range of NLP applications is seen in practice today. One of them is **Named Entity Recognition**. It uses deep learning-based approaches like LSTM. Long short-term memory is an artificial recurrent neural network (RNN) architecture used in deep learning. The LSTM network is made suitable to classify based on the rules, analyze to process the input and make predictions using the training data examples.
In general, using a pre-trained model is relevant for natural processing tasks were little training data is available. I chose a simple task of accident mapping by showing the locations where the incidents happend based on text reports. There is a new model called NeuroTRP which is suitable. NeuroTPR is a toponym recognition model designed for extracting locations from social media messages. It is based on a general *Bidirectional Long Short-Term Memory* network (BiLSTM) with a number of additional features. More details can be found in paper: [Wang, J., Hu, Y., & Joseph, K. (2020): NeuroTPR: A Neuro-net ToPonym Recognition model for extracting locations from social media messages.](http://www.acsu.buffalo.edu/~yhu42/papers/2020_TGIS_NeuroTPR.pdf)
{: style="text-align: justify" }
The first step is to collect the text data to visualize. It's easy to use the facebook-scraper module to get posts about accidents in Budapest. 

```python
txt = open(json_path, "w")
i = 0
for post in get_posts('bkkinfobudapest', pages=100):
    if len(str(post['text'].find('Baleset'))) == 1:
        i += 1
        txt.write(
        ''.join(('{"id": ', str(i), ', "text": "', post['text'][2:post['text'].rfind('\nBKK.HU\n')].replace('.\n', ''),
               '", "meta": {}, "annotation_approver": null, "comments": [], "labels": []}', '\n')))
txt.close()
```
Because the test data is Hungarian, but the model is trained on English text, we need to translate it with Bing.
```python
def english(text):
    HEADERS = {
    "Host": "www.bing.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:52.0) Gecko/20100101 Firefox/52.0",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "Referer": "https://www.bing.com/",
    "Content-Type": "application/x-www-form-urlencoded",
    "Connection": "keep-alive"
    }
    PARAMS = {'IG' : '839D27F8277F4AA3B0EDB83C255D0D70', 'IID' : 'translator.5033.3'}
    text = text.replace(' M ', ' ')
    text = re.sub(r'(?<!^)(?<!\. )[A-Z\u00C0-\u00DC][a-z\u00C0-\u017F]+', lambda x: '+'+''.join(
        [c.upper() if index % 2 == 0 else c.lower() for index, c in enumerate(x.group(0))]), text)
    request = po("https://www.bing.com/ttranslatev3", headers=HEADERS, params=PARAMS, data={'text': str(text), 'fromLang': 'hu', 'to': 'en'})
    if request.status_code < 400:
        return(loads(request.text)[0]["translations"][0]["text"])
    return(text)
```
When the data is prepared and ready for geoparsing, we load the **pretrained model**. Here comes the magic part: the model recognizes the *toponyms* (proper names of places, also known as place name or geographic name) from text.
```python
with open("bkk.jsonl", "rb") as file:
    for row in json_lines.reader(file):
        pass
data = prepare_data(path=json_path, batch_size=int(row['id'])-1, val_split_pct=0.01,
                    class_mapping={'address_tag':'Address'}, dataset_type='ner_json')
news = list([english(o[0]) for o in data.data.train_ds.data])
topos = []
geoparse.load_model("../PretrainedModel/")
for text in news:
    topos.append(ast.literal_eval(geoparse.topo_recog(re.sub(r'(\+\w+)', lambda x: ''.join(
        [c.lower() if index != 1 and c.isupper() else c for index, c in enumerate(
        x.group(0))]), text).replace('+', '').replace('wharf', 'Square').replace('sq','Sq').replace('str','Str').replace('bou','Bou').replace('roa','Roa'))))
```
We load the recognized locations into a dataframe.
```python
df = pd.DataFrame({'location': []})
for row in topos:
    df = df.append({'location': row}, ignore_index='True')
df['extracted'] = df.location.apply(lambda x: [y['location_name'] for y in x if len(y['location_name']) > 5][0])
```
By free geolocator services the dataframe is completed with the exact coordinates for each locations.
```python
def geocode_locations(processed_df, city, region, address_col):
    # creating address with city and region
    add_miner = processed_df[address_col].apply(lambda x: x+f', {city} '+f', {region}')
    locators = [Nominatim(user_agent="Twitterbot/1.0"), Photon(user_agent = "Twitterbot/1.0")]
    geocode1 = RateLimiter(locators[0].geocode, min_delay_seconds=1)
    geocode2 = RateLimiter(locators[1].geocode, min_delay_seconds=1)
    processed_df['location'] = processed_df[address_col].apply(lambda x: x+f', {city} '+f', {region}').apply(
        partial(geocode2, limit=1, location_bias=(47.5, 19.1)))
   
    def recode(row):
        if (not row.location) or (str(tuple(row.location)[0])[:2] != '47'):
            row['location'] = geocode1(str(row['extracted']) + f', {city} ' + f', {region}')
        return(row)
    
    processed_df = processed_df.apply(recode, axis=1)
    processed_df['point'] = processed_df['location'].apply(lambda loc: tuple(loc.point) if loc else None)
        
    return processed_df
```
Finally a layer of markers shows on the map where accidents happend.
```python
processed_df = geocode_locations(df.tail(100), city='Budapest', region='Hungary', address_col='extracted')
m = Map(center=(47.51, 19.04), zoom=11.5, basemap=basemaps.CartoDB.Positron)
marks = LayerGroup()
for idx in processed_df.index:
    row = processed_df.iloc[idx]
    if row.point is not None:
        mark = Marker(
        location=(row.point[0], row.point[1]),
        title=str(row["extracted"]),
        radius=5)
        marks.add_layer(mark)
m.add_layer(marks)
refresh_button = Button(description='Start refreshing...')
m.add_control(WidgetControl(widget=refresh_button, position='bottomright'))
refresh_button.on_click(refresh_marks)
widget.close()
m
```
The demo is available as a Binder app. _(Yes it starts slowly because it runs on free services. It takes time to load the pretrained model. The translation and the geocoding also slow, as a free user I have to limit the query rates. But it's only a demo. It shows how simple is to make a map from plain text, without knowing anything about a city and its place on the globe and its streets.)_.

[![badge](https://img.shields.io/badge/launch-binder%20app-F5A252.svg?logo=data:image/png;base64,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)](https://mybinder.org/v2/gh/dg-data/ner-env/HEAD?urlpath=%2Fgit-pull%3Frepo%3Dhttps%3A%2F%2Fgithub.com%2Fdg-data%2Fnb%26branch%3Dmain%26urlpath%3Dapps%2Fnb%2FNERmap.ipynb)
[![badge](https://img.shields.io/badge/launch-binder%20notebook-579ACA.svg?logo=data:image/png;base64,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)](https://mybinder.org/v2/gh/dg-data/ner-env/HEAD?urlpath=%2Fgit-pull%3Frepo%3Dhttps%3A%2F%2Fgithub.com%2Fdg-data%2Fnb%26branch%3Dmain%26urlpath%3Dnotebooks%2Fnb%2FNERmap.ipynb)
