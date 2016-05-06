SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		st-mssql-tools
-- Create date: {{date | date('m/d/Y')}}
-- Description:	Get from {{table}}
-- =============================================
CREATE PROCEDURE [dbo].[usp_{{table}}_Get]
	-- Add the parameters for the stored procedure here
	@p_{{identity.definition.replace('[', '').replace(']', '')}} = NULL
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON;

    -- Insert statements for procedure here
	SELECT {% for col in columns %}
         [{{col.name}}]{% if !loop.last %},{% endif %}{% endfor %}
	  FROM [dbo].[{{table}}]
	  WHERE (@p_{{identity.name}} is null OR [{{identity.name}}] = @p_{{identity.name}})

END
