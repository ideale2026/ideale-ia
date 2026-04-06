import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
};

// BotConversa automation catch URL (no API key needed — public catch endpoint)
const AUTOMATION_CATCH_URL =
  "https://new-backend.botconversa.com.br/api/v1/webhooks-automation/catch/182374/UGeHrBCz2DvR/";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const rawPhone: string = String(body.telefone ?? "").replace(/\D/g, "");
    const nome: string = String(body.nome ?? "");
    const origem: string = String(body.origem ?? "app_lovable");
    const produtos = Array.isArray(body.produtos_escolhidos) ? body.produtos_escolhidos : [];

    if (!rawPhone) {
      return new Response(JSON.stringify({ error: "telefone is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a readable products summary
    const produtosSummary = produtos
      .map(
        (p: { nome: string; referencia: string; preco: string; categoria: string | null }, i: number) =>
          `${i + 1}. ${p.nome} - ${p.preco}${p.categoria ? " [" + p.categoria + "]" : ""}`
      )
      .join("\n");

    // Payload matching BotConversa's expected format
    // "phone" is the key field BotConversa uses to identify/create the contact
    const payload = {
      phone: rawPhone,         // e.g. 5548996459791
      nome,
      origem,
      produtos: produtosSummary,
      total_produtos: String(produtos.length),
      produtos_json: JSON.stringify(produtos),
    };

    console.log("Sending to BotConversa:", JSON.stringify(payload));

    const res = await fetch(AUTOMATION_CATCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    console.log("BotConversa response:", res.status, responseText);

    if (res.ok) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If it fails, return the actual error for debugging
    return new Response(
      JSON.stringify({ error: "BotConversa trigger failed", detail: responseText, status: res.status }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error", detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
