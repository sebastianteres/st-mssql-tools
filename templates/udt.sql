CREATE TYPE [dbo].[udt_{{table}}_obj] AS TABLE(
    {% for col in columns %}
     {{col.definition}} null{% if !loop.last %},{% endif %}{% endfor %}
)
GO
