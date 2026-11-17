{# Generic volume test (DE-4): the model must have between min_rows and max_rows rows.
   Catches a source that silently lost most of its content while every row-level test still passes. #}
{% test row_count_between(model, min_rows, max_rows) %}
select count(*) as n
from {{ model }}
having count(*) < {{ min_rows }} or count(*) > {{ max_rows }}
{% endtest %}
