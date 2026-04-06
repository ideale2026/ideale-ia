import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallImageBase64, wallMimeType, productImageUrl } = await req.json();

    if (!wallImageBase64 || !productImageUrl) {
      return new Response(
        JSON.stringify({ error: "wallImageBase64 e productImageUrl são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurado");
    }

    // Fetch product image bytes
    const productRes = await fetch(productImageUrl);
    if (!productRes.ok) throw new Error("Erro ao buscar imagem do produto");
    const productBuffer = await productRes.arrayBuffer();
    const productBytes = new Uint8Array(productBuffer);

    // Decode wall image from base64
    const wallBytes = Uint8Array.from(atob(wallImageBase64), c => c.charCodeAt(0));

    // Build FormData with both images for gpt-image-1 edits endpoint
    const formData = new FormData();
    formData.append("model", "gpt-image-1");
    formData.append("image[]", new Blob([wallBytes], { type: "image/png" }), "wall.png");
    formData.append("image[]", new Blob([productBytes], { type: "image/png" }), "product.png");
    formData.append("prompt",
      "A primeira imagem é uma foto de uma parede ou ambiente real. A segunda imagem é um produto de decoração (papel de parede, jardim artificial, revestimento ou piso). " +
      "Aplique o produto da segunda imagem na superfície principal da primeira foto de forma completamente realista e fotorrealista. " +
      "Preserve ao máximo a iluminação, perspectiva, sombras e textura do ambiente original. " +
      "O resultado final deve parecer uma fotografia real do ambiente com o produto já instalado, sem aparência de montagem."
    );
    formData.append("size", "1024x1024");
    formData.append("quality", "high");

    const aiResponse = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("OpenAI API error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Aguarde alguns instantes e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: "Chave da OpenAI inválida ou sem permissão." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes na conta OpenAI." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Erro da OpenAI: ${aiResponse.status} - ${errText}`);
    }

    const data = await aiResponse.json();
    const b64 = data.data?.[0]?.b64_json;
    const url = data.data?.[0]?.url;

    const imageUrl = b64 ? `data:image/png;base64,${b64}` : url;

    if (!imageUrl) {
      console.error("OpenAI response without image:", JSON.stringify(data));
      throw new Error("A OpenAI não gerou nenhuma imagem. Tente novamente.");
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-wall-preview error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
