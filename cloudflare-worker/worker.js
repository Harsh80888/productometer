/**
 * ==========================================================================
 * 🤖 PRODUCTO - 100% CLOUDFLARE WORKERS AI BACKEND
 * Zero API Keys · Zero External APIs · 100% Free Edge AI
 * Models: Meta Llama 3.3 70B Fast / Llama 3.1 8B FP8 / Llama 3.2 3B
 * ==========================================================================
 */

export default {
  async fetch(request, env) {
    // 1. Handle CORS Preflight (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 2. Health Check (GET)
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "online",
          service: "Producto Cloudflare Workers AI",
          aiReady: !!env.AI,
          models: [
            "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
            "@cf/meta/llama-3.1-8b-instruct-fp8",
            "@cf/meta/llama-3.2-3b-instruct"
          ],
          timestamp: new Date().toISOString()
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    // 3. Process AI Request (POST)
    if (request.method === "POST") {
      try {
        const body = await request.json();
        const userPrompt = body.prompt || body.query || body.message || "";
        const userContext = body.context || {};

        if (!userPrompt.trim()) {
          return new Response(
            JSON.stringify({ success: false, error: "Empty prompt provided" }),
            { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
          );
        }

        const systemPrompt = `You are Producto, the elite cognitive productivity & lifestyle AI coach for the Productivity Meter app.
You provide encouraging, science-backed, concise advice formatted in clean GitHub Markdown with bullet points.
Keep your response focused, empathetic, and under 150 words.

User's Live Performance Context:
- Weight: ${userContext.weight ?? 70} kg, Goal: ${userContext.goal ?? 'maintain'}
- Net Daily Score: ${userContext.netScore ?? 0} pts
- Academics / Study Logged: ${userContext.nAcad ?? 0}h
- Non-Productive Screen Time: ${userContext.nScreen ?? 0}h
- Tasks Completed: ${userContext.completedTasksCount ?? 0}/${userContext.totalTasksCount ?? 0}
- Longest Break Today: ${userContext.longestBreakMins ?? 0}m

Answer the user's out-of-the-box question warmly and guide them toward sustainable momentum.`;

        if (!env.AI) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Workers AI binding 'AI' is missing in Cloudflare Settings > Bindings"
            }),
            { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
          );
        }

        const candidateModels = [
          "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          "@cf/meta/llama-3.1-8b-instruct-fp8",
          "@cf/meta/llama-3.2-3b-instruct",
          "@cf/meta/llama-3.2-1b-instruct"
        ];

        let replyText = "";
        let usedModel = "";

        for (const model of candidateModels) {
          try {
            const aiResponse = await env.AI.run(model, {
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ],
              max_tokens: 350,
              temperature: 0.6
            });

            if (aiResponse && aiResponse.response) {
              replyText = aiResponse.response;
              usedModel = model;
              break;
            }
          } catch (modelErr) {
            console.warn(`Model ${model} failed, trying next fallback:`, modelErr.message);
          }
        }

        if (!replyText) {
          replyText = "I am reflecting on your question. Let's focus on taking action on your next 30-minute block!";
        }

        return new Response(
          JSON.stringify({
            success: true,
            response: replyText,
            model: usedModel,
            engine: "Cloudflare Workers AI"
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );

      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err.message || "Failed to process AI inference"
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }
    }

    return new Response("Method Not Allowed", { status: 405 });
  }
};
