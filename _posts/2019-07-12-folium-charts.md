---
title: "Embedding interactive Folium map into a chart component"
date: 2020-09-12
tags: [dataviz, folium]
folium-loader:
  folium-chart-1: ["charts/covidmap.html", "800"]
hv-loader:
  hv-chart-1: ["charts/covidBokeh.html", "620"]
titles_from_headings:
  strip_title: false
toc: false
toc_sticky: true
classes: wide
---
Folium is built on the Leaflet javascript library, which is the leading open-source mapping library and a great tool for creating interactive web maps. In this example I demonstrate the workflow using GeoPandas and Folium that makes it easy to create functional web maps in Python. The map below is integrated into a Panel app that shows up to date European COVID data about new cases and deaths. The charts contain national level information from the countri(es) selected. On the interactive map of Hungary we can follow the weekly regional distribution of new cases. The darker tones indicate regions with more people infected.
{: style="text-align: justify" }

[![badge](https://img.shields.io/badge/launch-binder%20app-F5A252.svg?logo=data:image/png;base64,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)](https://mybinder.org/v2/gh/dg-data/binder-env/main/?urlpath=git-pull?repo=https://github.com/dg-data/tidbits%26amp%3Burlpath=panel?urlpath=tidbits/app-global)
[![badge](https://img.shields.io/badge/launch-binder%20notebook-579ACA.svg?logo=data:image/png;base64,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)](https://mybinder.org/v2/gh/dg-data/binder-env/main/?urlpath=git-pull?repo=https://github.com/dg-data/tidbits%26amp%3Burlpath=notebooks/tidbits/notebooks/pandemic.ipynb)
```python
import numpy as np
import pandas as pd
import folium
import geopandas as gp
from branca.colormap import linear
from bokeh.models import ColumnDataSource, GeoJSONDataSource, ColorBar, HoverTool, Legend, LogColorMapper
from bokeh.plotting import figure
from bokeh.layouts import row, column, gridplot
from bokeh.models import CustomJS, Select, MultiSelect, Plot, LinearAxis, Range1d, DatetimeTickFormatter
from bokeh.models.glyphs import Line, MultiLine
from bokeh.palettes import Set1
import urllib.request
from bs4 import BeautifulSoup
import panel as pn
import panel.widgets as pnw
import datetime as dt
pn.extension()
```
Scraping a page to find the link to the latest weekly data file.
```python
def scrape(url, tag, extension):
    page = urllib.request.urlopen(url).read()
    tags = BeautifulSoup(page, 'html.parser')(tag)
    for t in tags:
        href = t.get('href', '')
        if href[-len(extension):] == extension:
            return href
    return ''
```
Read and clean global epidemic data and calculate totals.
```python
def read_clean(url, filename):
    data = pd.read_excel(url + filename)
    data.countriesAndTerritories = data.countriesAndTerritories.str.replace('_', ' ')
    data.dateRep = pd.to_datetime(data.dateRep, infer_datetime_format=True)
    data = data.sort_values(['countriesAndTerritories', 'dateRep'])
    data['total cases'] = data.groupby(['countriesAndTerritories']).cases.apply(lambda x: x.cumsum())
    data['total deaths'] = data.groupby(['countriesAndTerritories']).deaths.apply(lambda x: x.cumsum())
    return data
```
```python
# Read geographic data for the map and trim to Hungary 
eu = gp.read_file('https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_10M_2021_4326_LEVL_3.geojson')
country = 'HU'
geo = eu.loc[eu['CNTR_CODE'] == country].sort_values('id')
# Read worldwide daily epidemic data
url = 'https://www.ecdc.europa.eu/sites/default/files/documents/'
excel = 'COVID-19-geographic-disbtribution-worldwide.xlsx'
world = read_clean(url, excel)
# Find and get weekly regional data
link = scrape(url='https://www.ecdc.europa.eu/en/publications-data/weekly-subnational-14-day-notification-rate-covid-19', tag='a', extension='xlsx')
sub = pd.read_excel(link)
sub.drop(sub[sub['nuts_code'].str[:2] != country].index, inplace=True)
# List of region codes in the country
nuts = list(sub.nuts_code.value_counts().index)
```
Plot the time series of the selected countries using Bokeh.
```python
def chart_countries:
    countries = country_select.value[:10]
    value = chart_select.value
    colors = Set1[9]
    items = []
    datasource = ColumnDataSource(pd.pivot_table(world, index='dateRep', columns='countriesAndTerritories', values=value).reset_index())        
    c = 0   
    chart = figure(plot_width=600, plot_height=600, x_axis_type='datetime', y_axis_type='linear', tools=[])        
    for country in countries:
        g = chart.add_glyph(datasource, Line(x='dateRep', y=country, line_color=colors[c], line_width=3, line_alpha=.8, name=country))
        c += 1
        items.append((country, [g]))
    chart.xaxis.axis_label = 'Date'
    first = dt.datetime(2020, 3, 1).date()
    today = dt.datetime.now().date()
    chart.xaxis.fixed_location = 0
    chart.x_range = Range1d(start=np.datetime64(first), end=np.datetime64(today)) 
    chart.yaxis.axis_label = value        
    chart.add_layout(Legend(location='top_left', items=items))    
    chart.background_fill_color = 'ghostwhite'
    chart.background_fill_alpha = 0.5
    chart.legend.label_text_font_size = '8pt'
    chart.toolbar.logo = None
    return chart
```
A choropleth map displays divided regions that are coloured in relation to a numeric variable. It allows to study how a variable evolutes along a territory. This time the variable is the number of new COVID cases in Hungary per 100 000 population. The size of the circle inside each region also indicates the value of this variable. The map is not about the absolute numbers but the proportions and the evolution of the outbreak.
{: style="text-align: justify" }
```python
def plot_map():
    m = folium.Map(location=[48,19], zoom_start=7.5, tiles=None, overlay=False)
    # The Folium map contains one layer with a feature group for each of the last 20 weeks
    start = int(sub.year_week.max()[-2:]) - 19
    weeks = len(sub.loc[sub['year_week'].str[-2:].ge(str(start))].sort_values('nuts_code').year_week.unique())
    for i in range(weeks):
        choropleth1 = folium.Choropleth(
            geo_data=geo,
            name='choropleth',
            data=sub.loc[sub['year_week'].str[-2:].eq(str(i + start))],
            columns=['nuts_code', 'rate_14_day_per_100k'],
            key_on='feature.properties.id',
            fill_color='Greys',
            fill_opacity=0.7,
            line_opacity=0.2,
            highlight=True,
            line_color='black',
            bins=list(sub.loc[sub['year_week'].str[-2:].eq(str(i + start))].rate_14_day_per_100k.quantile([0, 0.05, 0.1, 0.2, 0.4, 0.6, 0.75, 0.9, 1]))
        ).geojson.add_to(
            folium.FeatureGroup(
                overlay=False, name='Week '+str(i + start)).add_to(m))

        for c in range(0, len(nuts)):
            point = geo[geo.values[:, 0] == nuts[c]].geometry.representative_point()
            # For every region we draw a circle with a radius according to the data represented
            folium.Circle(
                location=[point.y, point.x],
                geo_data=geo,
                radius=float(sub.loc[(sub['nuts_code'] == nuts[c]) & (sub['year_week'].str[-2:].eq(str(i + start)))].rate_14_day_per_100k*50),
                color='crimson',
                fill=True,
                fill_color='blue').add_to([fs for key, fs in m._children.items()][i])
        # Tooltip with the regions' names
        geojson1 = folium.GeoJson(data=geo, tooltip=folium.features.GeoJsonTooltip(['NUTS_NAME'], labels=False), style_function=lambda x: {'color':'black','fillColor':'transparent','weight':0.5},
    ).add_to(choropleth1)
    # Adding a layer control to choose from weekly maps
    folium.LayerControl(collapsed=False).add_to(m)
    return m
```
```python
# Building the Panel dashboard: a chart with two selectors, and an independent choropleth map of Hungarian regional data
countries = list(world.countriesAndTerritories.unique())
top_countries = ['Germany','United Kingdom','United States of America','Spain','Italy','France','Israel','Australia','Brazil','Sweden','Russia','India']
country_select = pnw.MultiSelect(name='Country', value=top_countries[:3], height=150, options=countries, width=150)
country_select.param.watch(chart_countries, 'value')
chart_select = pnw.Select(name='Chart of', value='cases', options=['cases','deaths','total cases','total deaths'], width=150)
chart_select.param.watch(chart_countries, 'value')
title = pn.pane.HTML('<h2>Coronavirus plots</h2>')
chart = chart_countries()
chart_pane = pn.pane.Bokeh(chart)
mp = plot_map()
map_pane = pn.pane.plot.Folium(mp)
app = pn.Column(
  pn.Row(pn.Column(title, country_select, chart_select), chart_pane, pn.Spacer(min_width=180)),
  pn.pane.HTML('<h2>New cases in Hungary per 100 000 population by week</h2>'),
  map_pane
)
```
The chart below is a static snapshot, the live version available on Binder. _(It starts slowly because of preparing the environment for running)_.
```python
app.servable()
```
<div id="hv-chart-1"></div>
#### New cases in Hungary per 100 000 population by week (interactive)
<div id="folium-chart-1"></div>
