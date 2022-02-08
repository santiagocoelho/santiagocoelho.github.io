---
layout: archive
title: "Main publications"
permalink: /publications/
author_profile: true
---

You can find all my articles on my [Google Scholar profile](https://scholar.google.com/citations?user=SraRlxoAAAAJ&hl=en)


{% include base_path %}

{% for post in site.publications reversed %}
  {% include archive-single.html %}
{% endfor %}
