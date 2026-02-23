-- check_schema.sql
USE DACN;
GO

SELECT 
    t.name AS TableName,
    c.name AS ColumnName,
    ty.name AS DataType
FROM sys.tables t
JOIN sys.columns c ON t.object_id = c.object_id
JOIN sys.types ty ON c.user_type_id = ty.user_type_id
WHERE t.name IN ('companies', 'users', 'company_members', 'company_settings')
ORDER BY t.name, c.column_id;
GO
