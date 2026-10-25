import { NextRequest, NextResponse } from "next/server";
import { getOrderByContractorToken, updateContractorWork } from "@/lib/admin";
import cemeteries from "@/data/cemeteries.json";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const order = await getOrderByContractorToken(token);

    if (!order) {
      return NextResponse.json({ ok: false, error: "Nie znaleziono zlecenia" }, { status: 404 });
    }

    const cem = cemeteries.find((c) => c.id === order.cemeteryId);

    return NextResponse.json({
      ok: true,
      data: {
        order,
        cemeteryDetails: cem || null
      }
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

const ContractorUpdateSchema = z.object({
  photoBeforeDataUrl: z.string().optional(),
  photoAfterDataUrl: z.string().optional(),
  contractorNotes: z.string().optional(),
  isCompleted: z.boolean().optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();

    const parsed = ContractorUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Nieprawidłowe dane" }, { status: 400 });
    }

    await updateContractorWork(token, parsed.data);
    const updated = await getOrderByContractorToken(token);

    return NextResponse.json({ ok: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
