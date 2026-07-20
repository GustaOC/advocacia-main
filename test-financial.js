const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase
      .from('financial_agreements')
      .select(`
        *,
        cases:case_id (
          case_number,
          title,
          status,
          case_parties (
            role,
            entities:entity_id (
              name,
              document,
              email,
              phone
            )
          )
        ),
        client_entities:entities!fk_financial_agreements_debtor (
          name,
          document,
          email,
          phone
        ),
        installments:financial_installments (
          id,
          installment_number,
          amount,
          due_date,
          status
        )
      `)
      .order('created_at', { ascending: false })
      .limit(1);

  console.log(error || "Success");
}
test();
