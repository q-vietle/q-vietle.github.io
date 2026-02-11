---
title: "Projects"
permalink: /projects/
---

Selected research and software projects are listed below.

<div class="academic-card-grid">
{% for project in site.data.projects %}
  <article class="academic-card">
    <h3>{{ project.name }}</h3>
    <p>{{ project.summary }}</p>
    <p><strong>Role:</strong> {{ project.role }}</p>
    <p><strong>Tech:</strong> {{ project.technologies }}</p>
    <p><a href="{{ project.repo_url }}">Repository</a> | <a href="{{ project.demo_url }}">Demo</a></p>
  </article>
{% endfor %}
</div>
