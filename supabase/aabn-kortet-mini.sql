insert into public.indstillinger (lokation_id, noegle, vaerdi)
select 'mosede', 'bestilbare_kategorier',
       jsonb_agg(id order by id)
  from public.menu_kategorier
 where aktiv and afdeling <> 'is'
   and navn in ('Retter', 'Sandwich og retter fra pladen', 'Burgere og sandwich',
                'Pølser', 'Morgenmad', 'Øl', 'Vin, cava og champagne',
                'Sodavand, juice og kakao', 'Snacks og slik')
on conflict (lokation_id, noegle) do update set vaerdi = excluded.vaerdi;

select vaerdi as aabnede_kategorier from public.indstillinger
 where noegle = 'bestilbare_kategorier';
