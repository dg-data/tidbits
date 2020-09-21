---
title: "Example: Embedding Folium map"
date: 2020-07-12
published: true
tags: [dataviz, folium]
excerpt: "Embedding interactive Folium map on static page"
folium-loader:
  folium-chart-1: ["charts/covidmap.html", "800"]
toc: false
toc_sticky: true
classes: wide
---
Folium is built on the Leaflet javascript library, which is the leading open-source mapping library and a great tool for creating interactive web maps. In this example I demonstrate the workflow using GeoPandas and Folium that makes it easy to create functional web maps in Python. The map below is integrated into a Panel app that shows up to date European COVID data about new cases and deaths. The charts contain national level information from the countri(es) selected. On the interactive map of Hungary we can follow the weekly regional distribution of new cases. The darker tones indicate more people infected.
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
def chart_countries(event):
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
    chart_pane.object = chart
    return
```
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
top_countries = ['China','United Kingdom','United States of America','Spain','Italy','France','Iran','Australia','Brazil','Sweden','Russia','India']
country_select = pnw.MultiSelect(name='Country', value=top_countries[:3], height=150, options=countries, width=150)
country_select.param.watch(chart_countries, 'value')
chart_select = pnw.Select(name='Chart of', value='cases', options=['cases','deaths','total cases','total deaths'], width=150)
chart_select.param.watch(chart_countries, 'value')
title = pn.pane.HTML('<h2>Coronavirus plots</h2>')
chart_pane = pn.pane.Bokeh()
chart = chart_countries(None)
mp = plot_map()
map_pane = pn.pane.plot.Folium(mp)
app = pn.Column(pn.Row(pn.Column(title, country_select, chart_select), chart_pane, pn.Spacer(min_width=180)),
              pn.pane.HTML('<h2>New cases in Hungary per 100 000 population by week</h2>'), map_pane)
```
```python
app.servable()
```

## New cases in Hungary per 100 000 population by week

<div id="folium-chart-1"></div>


