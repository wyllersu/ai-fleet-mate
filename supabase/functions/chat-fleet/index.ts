import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client to fetch fleet data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all vehicles
    const { data: vehicles, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("*");

    if (vehiclesError) {
      console.error("Error fetching vehicles:", vehiclesError);
      throw vehiclesError;
    }

    // Fetch all maintenances
    const { data: maintenances, error: maintenancesError } = await supabase
      .from("maintenances")
      .select("*");

    if (maintenancesError) {
      console.error("Error fetching maintenances:", maintenancesError);
      throw maintenancesError;
    }

    // Handle specific commands
    let commandResponse = null;
    const msgLower = message.toLowerCase().trim();

    // Command: Update KM
    const kmUpdateMatch = msgLower.match(/atualizar km\s+(\S+)\s+(\d+)/i);
    if (kmUpdateMatch) {
      const [, plateOrNumber, newKm] = kmUpdateMatch;
      const vehicle = vehicles?.find(v => 
        v.license_plate.toLowerCase() === plateOrNumber.toLowerCase() ||
        v.vehicle_number.toLowerCase() === plateOrNumber.toLowerCase()
      );
      
      if (vehicle) {
        const { error: updateError } = await supabase
          .from("vehicles")
          .update({ km_current: parseInt(newKm) })
          .eq("id", vehicle.id);

        if (!updateError) {
          commandResponse = `✅ Quilometragem do veículo ${vehicle.vehicle_number} (${vehicle.license_plate}) atualizada para ${newKm} km com sucesso!`;
        }
      }
    }

    // Prepare system prompt with fleet context
    const systemPrompt = `Você é um assistente de IA especializado em gestão de frotas. Você tem acesso completo aos dados da frota e pode responder perguntas sobre veículos, manutenções, custos e análises.

DADOS DA FROTA:
${JSON.stringify({ vehicles, maintenances }, null, 2)}

INSTRUÇÕES:
- Responda em português brasileiro
- Seja conciso e objetivo
- Use emojis para tornar as respostas mais visuais (🚗 para veículos, 🔧 para manutenções, 💰 para custos, 📊 para análises)
- Para consultas de status, forneça um resumo claro e organizado
- Para históricos, liste cronologicamente
- Para análises, calcule os valores e forneça insights úteis
- Sempre formate valores monetários como R$ X.XXX,XX
- ${commandResponse ? "IMPORTANTE: Já executei o comando e obtive este resultado: " + commandResponse : ""}

COMANDOS ESPECIAIS QUE VOCÊ RECONHECE:
- "STATUS DA FROTA" - Resumo geral
- "HISTÓRICO DO [VEÍCULO]" - Todas as manutenções de um veículo específico
- "ATUALIZAR KM [PLACA/NÚMERO] [NOVA_KM]" - Atualizar quilometragem (já executado automaticamente)`;

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Limite de requisições excedido. Por favor, tente novamente mais tarde." 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Créditos insuficientes. Por favor, adicione créditos ao seu workspace." 
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in chat-fleet function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});