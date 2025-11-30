---
layout: default
title: Research Library
permalink: /library/
---

# Research Library

Access my full collection of research proposals, white papers, and technical documents.

<div class="library-grid">
  {% for research in site.research %}
  <div class="library-item" style="border: 1px solid #eee; padding: 20px; margin-bottom: 20px; border-radius: 8px; background-color: #f9f9f9;">
    <h3 style="margin-top: 0;"><a href="{{ research.url }}">{{ research.title }}</a></h3>
    <p>
      {% for tag in research.tags %}
      <span style="background: #e1ecf4; color: #2c5e77; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; margin-right: 5px;">{{ tag }}</span>
      {% endfor %}
    </p>
    <p>{{ research.excerpt }}</p>
    <div class="actions" style="margin-top: 15px;">
      <a href="{{ research.pdf_url }}" class="button" download style="text-decoration: none; background: #333; color: #fff; padding: 8px 15px; border-radius: 4px; font-size: 0.9em;"><i class="fa fa-download"></i> Download PDF</a>
      <a href="{{ research.url }}" style="margin-left: 10px; font-size: 0.9em;">Read Abstract &raquo;</a>
    </div>
  </div>
  {% endfor %}
</div>
