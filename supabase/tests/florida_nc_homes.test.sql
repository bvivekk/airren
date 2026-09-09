begin;
select plan(4);

select is(
  (select name from homes where slug = 'siesta-key-house'),
  'Siesta Key House',
  'siesta key house is available'
);

select is(
  (select region from homes where slug = 'siesta-key-house'),
  'FL',
  'siesta key is in florida'
);

select is(
  (select name from homes where slug = 'asheville-ridge'),
  'Asheville Ridge',
  'asheville ridge is available'
);

select is(
  (select region from homes where slug = 'asheville-ridge'),
  'NC',
  'asheville ridge is in north carolina'
);

select * from finish();
rollback;
