begin;

-- Abre duas posições após a antiga etapa combinada, preservando eventuais
-- etapas de problemática já inseridas antes dela.
do $$
declare
  workflow_row record;
  combined_step record;
  step_row record;
begin
  for workflow_row in select id, current_step from public.petition_workflows loop
    select id, step_number, status
      into combined_step
    from public.petition_workflow_steps
    where workflow_id = workflow_row.id
      and step_name = 'Tese jurídica [Sonnet - temática / Opus - tese jurídica]'
    limit 1;

    if combined_step.id is null then
      continue;
    end if;

    for step_row in
      select id, step_number
      from public.petition_workflow_steps
      where workflow_id = workflow_row.id
        and step_number > combined_step.step_number
      order by step_number desc
    loop
      update public.petition_workflow_steps
      set step_number = step_row.step_number + 2
      where id = step_row.id;
    end loop;

    update public.petition_workflow_steps
    set step_name = 'Tese temática (Sonnet)',
        assigned_to = 'f17e2449-612b-4159-bf39-31f3109d6755'
    where id = combined_step.id;

    insert into public.petition_workflow_steps
      (workflow_id, step_number, step_name, assigned_to, status)
    values
      (workflow_row.id, combined_step.step_number + 1, 'Questões pendentes', '9e1b52fd-ab8a-43c3-ba7d-03b9705870e1',
        case when combined_step.status = 'Concluída' and workflow_row.current_step > combined_step.step_number then 'Concluída' else 'Pendente' end),
      (workflow_row.id, combined_step.step_number + 2, 'Tese jurídica (Opus)', 'f17e2449-612b-4159-bf39-31f3109d6755',
        case when combined_step.status = 'Concluída' and workflow_row.current_step > combined_step.step_number then 'Concluída' else 'Pendente' end);

    if workflow_row.current_step > combined_step.step_number then
      update public.petition_workflows
      set current_step = workflow_row.current_step + 2
      where id = workflow_row.id;
    end if;
  end loop;
end $$;

commit;
