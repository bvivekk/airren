create or replace function process_razorpay_event(
  p_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_order_id text default null,
  p_payment_id text default null,
  p_amount_paise integer default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    insert into public.razorpay_events (id, event_type, payload)
    values (p_event_id, p_event_type, p_payload);
  exception
    when unique_violation then
      return 'duplicate';
  end;

  if p_event_type = 'payment.captured' then
    begin
      perform public.confirm_booking(
        p_order_id,
        p_payment_id,
        p_amount_paise
      );
    exception
      when raise_exception then
        if sqlerrm = 'amount mismatch' then
          return 'amount_mismatch';
        end if;
        raise;
    end;
  elsif p_event_type = 'payment.failed' then
    perform public.fail_booking(p_order_id);
  end if;

  return 'processed';
end;
$$;

revoke all on function process_razorpay_event(text, text, jsonb, text, text, integer)
  from public, anon, authenticated;
grant execute on function process_razorpay_event(text, text, jsonb, text, text, integer)
  to service_role;
