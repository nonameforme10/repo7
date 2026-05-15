export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      ok: true,
      app: "caretrack",
      service: "web",
      via: "next",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
