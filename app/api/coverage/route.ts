import {coverage} from "@/lib/journal-service";
export async function GET(){return Response.json(await coverage(),{headers:{"Cache-Control":"public, max-age=3600"}});}
