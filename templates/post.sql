SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		st-mssql-tools
-- Create date: {{date | date('m/d/Y')}}
-- Description:	Insert or Update {{table}}
-- =============================================
CREATE PROCEDURE [dbo].[usp_{{table}}_Post]
	@p_Records udt_{{table}}_obj READONLY
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
    SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
    SET NOCOUNT ON;

	-- Declare some useful variables.
	Declare @Result udt_{{table}}_obj;

	-- Update existing records
	UPDATE [dbo].[{{table}}]
	   SET
        {% for col in columns %}{% if !col.isIdentity %}
         [{{col.name}}] = r.{{col.name}}{% if !loop.last %},{% endif %}{% endif %}{% endfor %}
	OUTPUT inserted.*
	INTO @Result
	FROM {{table}} t
	JOIN @p_Records r ON t.{{identity.name}} = r.{{identity.name}}

	-- Insert new records
	INSERT INTO [dbo].{{table}}
           ({% for col in columns %}{% if !col.isIdentity %}{{col.name}}{% if !loop.last %},{% endif %}
               {% endif %}{% endfor %})
	OUTPUT inserted.*
	INTO @Result
	SELECT {% for col in columns %}{% if !col.isIdentity %}
        r.{{col.name}}{% if !loop.last %},{% endif %}{% endif %}{% endfor %}
	FROM @p_Records r
	WHERE r.{{identity.name}} IS NULL

	SELECT * FROM @Result
END
