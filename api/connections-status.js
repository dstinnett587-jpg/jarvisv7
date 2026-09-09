export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const meta=Boolean(process.env.META_ACCESS_TOKEN&&process.env.META_AD_ACCOUNT_ID);
  const shopify=Boolean(process.env.SHOPIFY_STORE_DOMAIN&&process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
  const campaign=Boolean(process.env.MAISONVERE_CAMPAIGN_MANIFEST_URL);
  return res.status(200).json({meta,shopify,campaign,checkedAt:new Date().toISOString()});
}