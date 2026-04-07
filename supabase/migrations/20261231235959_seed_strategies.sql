INSERT INTO public.calculation_strategies (name, slug, description)
VALUES 
  ('Rolo de Papel de Parede', 'WALLPAPER_ROLL', 'Cálculo baseado em rolos e faixas de cobertura.'),
  ('Unidade Simples', 'SIMPLE_UNIT', 'Cálculo direto por unidade ou metro quadrado.')
ON CONFLICT (slug) DO NOTHING;
