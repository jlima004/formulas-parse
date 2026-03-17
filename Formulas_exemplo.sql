-- LISTA TUDO DA TABELA FORMULAS
SELECT *
FROM formulas;
-- LISTA TUDO DA TABELA FORMULA_ITEMS
SELECT *
FROM formula_items;
-- LISTA TUDO DA TABELA FORMULAS COM ID = ****
SELECT *
FROM formulas -- INSIRA UM ID VÁLIDO
WHERE id = "73a9625d-f437-45fe-9ade-65fe709407fb";
-- LISTA TUDO DA TABELA FORMULAS AGRUPADA POR ID E CONTANDO QUANTIDADE DE ITENS
SELECT formulas.*,
    COUNT(formula_items.id) AS quantidade_de_itens
FROM formulas
    LEFT JOIN formula_items ON formulas.id = formula_items.formula_id
GROUP BY formulas.id
ORDER BY formulas.id ASC;