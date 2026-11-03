import zipfile
import os

kml_content = """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Тепловые сети Test</name>
      <Point>
        <coordinates>73.3682,54.9893,0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>
"""
with zipfile.ZipFile("demo/Тепловые_сети.kmz", "w", zipfile.ZIP_DEFLATED) as zf:
    zf.writestr("doc.kml", kml_content)
