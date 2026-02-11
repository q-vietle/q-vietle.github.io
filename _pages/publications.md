---
title: "Publications"
permalink: /publications/
---

Below is a selected list of publications. Replace the placeholder entries in `_data/publications.yml` with your own records.

{% assign publications = site.data.publications | sort: "year" | reverse %}
{% assign current_year = "" %}

{% for pub in publications %}
  {% if pub.year != current_year %}
### {{ pub.year }}
  {% assign current_year = pub.year %}
  {% endif %}

- **{{ pub.title }}**  
  {{ pub.authors }}  
  *{{ pub.venue }}*  
  DOI: [{{ pub.doi }}]({{ pub.doi_url }}) | [BibTeX]({{ pub.bibtex_url }}){% if pub.pdf_url %} | [PDF]({{ pub.pdf_url }}){% endif %}

{% endfor %}
