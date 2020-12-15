---
title: Cleaning data with QGrid
date: 2020-10-12
published: true
toc: false
classes: wide
tags: [qgrid, python]
summary: Display and edit web scraped data easily using Python.
---


<!-- QGrid embedding -->

Qgrid is a Jupyter notebook widget which allows you to explore data with intuitive scrolling, sorting, and filtering controls, as well as edit DataFrames like in an Excel-like table.
The next example demonstrate how to explore data from web scraping with QGrid.
```python
import pandas as pd
import urllib.request
from bs4 import BeautifulSoup
import re
import http.cookiejar
import qgrid
import ipywidgets as widgets
from IPython.core.display import display, HTML
from abc import ABCMeta, abstractmethod
```

```python
# First define the abstract base class for the sites to collect data from
class Site:
    __metaclass__ = ABCMeta
    __cookie = http.cookiejar.CookieJar()
    __handler = urllib.request.HTTPCookieProcessor(__cookie)
    opener = urllib.request.build_opener(__handler)
    
    @abstractmethod
    def Crawl(self, query, min_page=0, max_page=1):
        pass

class Crawler:
    def SetTarget(self, target):
        self.__target = target
        
    def GetData(self, min_page, max_page, query=None):
        if query is None:
            return self.__target.Crawl(min_page=min_page, max_page=max_page)
        else:
            return self.__target.Crawl(query, min_page, max_page)
```


The sites we will collect data from contain job listings. For every site there is a derived class which implements the method from the base class. In the URL parameters we define a query to filter results, and set the limit of 30 jobs per page.
Then in a loop our function scrapes data between pages *min_page* and *max_page*. It stores the HTML source of job descriptions also to browse later. The result is a pandas dataframe.
```python
class Inded(Site):
    def Crawl(self, query='(IT+or+adatb%C3%A1zis+or+data+or+fejleszt%C5%91+or+SQL+or+Python+or+developer+or+web+or+scraping)', min_page=0, max_page=1):
        url = 'https://hu.indeed.com/jobs?q=' + query +'&l=Budapest&limit=30&sr=directhire'
        self.__data = []
        for p in range (min_page, max_page):
            param = '&start=' + str(p * 30)
            param = '' if p == 0 else param
            soup = BeautifulSoup(self.opener.open(url + param).read(), 'html.parser').find_all('h2', class_='title')
            for j in soup:
                title = j.find_next('a').get_text(strip=True)
                try:
                    company = j.find_next('span', class_='company').get_text(strip=True)
                except:
                    company = None
                summary = j.find_next('div', class_='summary').get_text(strip=True)
                page = BeautifulSoup(opener.open('https://hu.indeed.com/viewjob?jk=' + j.parent.get('data-jk')).read(), 'html.parser').find('div', class_='jobsearch-jobDescriptionText')
                try:
                    redirect = opener.open('https://hu.indeed.com/rc/clk?jk=' + j.parent.get('data-jk')).url
                except:
                    redirect = None
                self.__data.append([title, company, summary, page, redirect])
        if len(self.__data) > 0:
            df = pd.DataFrame(self.__data)
            df.columns = ['Title','Company','Summary','Page', 'URL']
            return df
```

```python
class Joble(Site):
    def Crawl(self, query='SQL+Python', min_page=0, max_page=1):
        url = 'https://hu.jooble.org/SearchResult?ukw={}&rgns=Budapest'
        self.__data = []
        for p in range (min_page, max_page):
            param = '&p=' + str(p * 1)
            param = '' if p == 0 else param
            soup = BeautifulSoup(self.opener.open(url.format(query) + param).read(), 'html.parser').find_all('div', class_='top-wr')
            for job in soup:
                link = job.find_next('a').get('href')
                title = job.find_next('h2', class_='position').get_text()
                try:
                    company = job.find_next('span', class_='company-name').get_text(strip=True)
                except:
                    company = None
                summary = job.find_next('span', class_='description').get_text(strip=True)
                page, redirect = (None, None)
                if link.split('.')[2][4] == 'd':
                    page = BeautifulSoup(self.opener.open(link).read(), 'html.parser').find('div', id='root')
                else:
                    try:
                        redirect = self.opener.open(link).url
                    except:
                        redirect = None
                if page is None:
                    red = BeautifulSoup(self.opener.open(redirect).read(), 'html.parser')
                    page = red.find('div', id='root') if red.find('div', id='root') is not None \
                        else BeautifulSoup(self.opener.open(red.find('a', id='aGo').get('href')).read(), 'html.parser')

                [x.extract() for x in page(["script", "style", "svg", "ins", "use", "button", "meta", "link"])]
                [x.extract() for x in page.select('div[class=""]')]
                self.__data.append([title, company, summary, page, redirect])

        if len(self.__data) > 0:
            df = pd.DataFrame(self.__data)
            df.columns = ['Title','Company','Summary','Page', 'URL']
            return df
```
Now we have the data to load into the grid after setting some options.

```python
qgrid.set_grid_option('forceFitColumns', False)
pd.set_option('max_colwidth', None)
```
For the row actually selected in the grid we can create an output widget. 


```python
selected = widgets.Output(layout=widgets.Layout(border='1px solid ghostwhite', 
                                                   height='99%', 
                                                   width='99%', 
                                                   overflow_x='auto', 
                                                   overflow_y='auto', 
                                                   overflow='auto')
                            )
selected
```
When the selection in the grid changed, the output widget renders the HTML field stored in the selected row formatted. If you run the code above in **JupyterLab**, it allows you to take the cell output and duplicate it in a new window, allowing you to stack it, view it side-by-side.

```python
def get_current(event, qgrid_widget):
    output_area = selected
    with output_area:
        display(HTML(qgrid_widget.get_selected_df().iloc[0].to_frame().T.to_html(columns=['Page'], notebook=True, index=False, header=False, escape=False, formatters={'Page': lambda x: x.prettify(formatter='html')})))
        output_area.clear_output(wait=True)
qgrid.on(['selection_changed'], get_current)
```
 This way the target is exchangeable easily. Now it's time to start scraping and load the data to clean in the grid manually.
 The HTML field in the row selected is visible in the other window. (In the real grid in JupyterLab it changes as we browse).
```python
spider = Crawler()
spider.SetTarget(Joble())
df = spider.GetData(min_page=1, max_page=2)
qgrid_df = qgrid.show_grid(df, column_definitions={'index': {'maxWidth': 0, 'minWidth':0, 'width':0}, 'Page': {'maxWidth':0, 'minWidth':0, 'width':0}}, show_toolbar=True)
qgrid_df
```

<div class="row">
<div style="float: right; width: 50%; display: flex; flex-direction: column; align-items: stretch; font-size:12px; background-color: white">
{% include widget.html %}
</div>
<div style="float: left; width: 50%;">
{% include qgrid.html %}
</div>
</div>

***
<div style="clear: both;">
Finally we can save the edited data to memory and write it to file.
</div>
```python
def read_jobs(file):
    try:
        return pd.read_pickle(file)
    except OSError:
        pass
```


```python
jobs = read_jobs('data.pkl')
jobs = qgrid_df.get_changed_df() if jobs is None else jobs.append(qgrid_df.get_changed_df())
```


```python
jobs.to_pickle('./data.pkl')
```
