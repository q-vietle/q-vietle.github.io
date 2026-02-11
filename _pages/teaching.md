---
title: "Teaching"
permalink: /teaching/
---

This page lists teaching activities and course materials.

<div class="academic-card-grid">
{% for item in site.data.teaching %}
  <article class="academic-card">
    <h3>{{ item.course_code }}: {{ item.course_title }}</h3>
    <p><strong>Semester:</strong> {{ item.semester }}</p>
    <p><strong>Role:</strong> {{ item.role }}</p>
    <p><a href="{{ item.syllabus_url }}">Syllabus</a></p>
  </article>
{% endfor %}
</div>
