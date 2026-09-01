begin;

create temporary table petition_workflow_new_progress on commit drop as
select
  workflow.id,
  case
    when workflow.current_step < 5 then workflow.current_step
    when current_step.step_name ilike '%acompanhamento pós protocolo%' then 15
    when current_step.step_name ilike '%protocolo%' then 14
    when current_step.step_name ilike '%revisão final%' then 13
    when current_step.step_name ilike '%formatar%' then 11
    when current_step.step_name ilike '%auditoria%' then 11
    when current_step.step_name ilike '%elaborar petição%' then 10
    when current_step.step_name ilike '%documentação complementar%' then 9
    when current_step.step_name ilike '%preparação dos insumos%' then 7
    when current_step.step_name ilike '%contratação%' then 7
    when current_step.step_name ilike '%proposta%' then 6
    when current_step.step_name ilike '%viabilidade%' then 5
    else greatest(5, least(workflow.current_step, 15))
  end as current_step
from public.petition_workflows as workflow
left join public.petition_workflow_steps as current_step
  on current_step.workflow_id = workflow.id
 and current_step.step_number = workflow.current_step;

create temporary table petition_workflow_new_steps (
  step_number integer primary key,
  step_name text not null,
  assigned_to uuid not null
) on commit drop;

insert into petition_workflow_new_steps (step_number, step_name, assigned_to)
values
  (5, 'Viabilidade (Claude)', '9e1b52fd-ab8a-43c3-ba7d-03b9705870e1'),
  (6, 'Proposta de honorários', 'c766d4cf-1f79-497c-92a3-4378905aafe9'),
  (7, 'Contratação', '9e1b52fd-ab8a-43c3-ba7d-03b9705870e1'),
  (8, 'Elaborar contrato, procuração e declaração', 'c766d4cf-1f79-497c-92a3-4378905aafe9'),
  (9, 'Documentação complementar', 'f17e2449-612b-4159-bf39-31f3109d6755'),
  (10, 'Elaborar petição (Claude)', 'f17e2449-612b-4159-bf39-31f3109d6755'),
  (11, 'Auditoria (GPT)', 'f17e2449-612b-4159-bf39-31f3109d6755'),
  (12, 'Formatação', 'c766d4cf-1f79-497c-92a3-4378905aafe9'),
  (13, 'Revisão final', '9e1b52fd-ab8a-43c3-ba7d-03b9705870e1'),
  (14, 'Protocolo e numeração do processo', 'f17e2449-612b-4159-bf39-31f3109d6755'),
  (15, 'Acompanhamento pós protocolo', '9e1b52fd-ab8a-43c3-ba7d-03b9705870e1');

update public.petition_workflow_steps as step
set
  step_name = config.step_name,
  assigned_to = config.assigned_to
from petition_workflow_new_steps as config
where step.step_number = config.step_number;

insert into public.petition_workflow_steps (
  workflow_id,
  step_number,
  step_name,
  assigned_to,
  status
)
select
  workflow.id,
  config.step_number,
  config.step_name,
  config.assigned_to,
  case
    when workflow.status = 'Concluída' or config.step_number < progress.current_step then 'Concluída'
    when config.step_number = progress.current_step then 'Em andamento'
    else 'Pendente'
  end
from public.petition_workflows as workflow
join petition_workflow_new_progress as progress on progress.id = workflow.id
cross join petition_workflow_new_steps as config
where not exists (
  select 1
  from public.petition_workflow_steps as existing
  where existing.workflow_id = workflow.id
    and existing.step_number = config.step_number
);

update public.petition_workflow_steps as step
set status = case
  when workflow.status = 'Concluída' or step.step_number < progress.current_step then 'Concluída'
  when step.step_number = progress.current_step then 'Em andamento'
  else 'Pendente'
end
from public.petition_workflows as workflow
join petition_workflow_new_progress as progress on progress.id = workflow.id
where step.workflow_id = workflow.id
  and step.step_number >= 5;

update public.petition_workflows as workflow
set current_step = progress.current_step
from petition_workflow_new_progress as progress
where workflow.id = progress.id;

commit;
