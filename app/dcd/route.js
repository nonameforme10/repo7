export function GET(request) {
  return Response.redirect(new URL("/dcd.html", request.url), 308);
}
