// src/app/admin/access/page.tsx
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export default async function AdminAccessPage() {
  // lee lista blanca
  const allowed = await prisma.allowedEmail.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Panel de administración · Accesos</h1>

      <form
        action={async (formData) => {
          "use server";
          const email = formData.get("email")?.toString().toLowerCase();
          const role = (formData.get("role")?.toString() || "player") as
            | "admin"
            | "player";

          if (!email) return;

          await prisma.allowedEmail.upsert({
            where: { email },
            update: { isActive: true, role },
            create: { email, role, isActive: true },
          });

          revalidatePath("/admin/access");
        }}
        className="flex gap-3"
      >
        <input
          type="email"
          name="email"
          placeholder="nuevo@email.com"
          className="border rounded p-2 flex-1"
          required
        />
        <select name="role" className="border rounded p-2">
          <option value="player">Jugador</option>
          <option value="admin">Administrador</option>
        </select>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Añadir
        </button>
      </form>

      <table className="min-w-full border border-gray-300 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-3 py-2 text-left">Email</th>
            <th className="border px-3 py-2 text-left">Rol</th>
            <th className="border px-3 py-2 text-left">Activo</th>
            <th className="border px-3 py-2 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {allowed.map((item) => (
            <tr key={item.email}>
              <td className="border px-3 py-2">{item.email}</td>
              <td className="border px-3 py-2 capitalize">{item.role}</td>
              <td className="border px-3 py-2">{item.isActive ? "✅" : "❌"}</td>
              <td className="border px-3 py-2">
                <form
                  action={async () => {
                    "use server";
                    await prisma.allowedEmail.delete({
                      where: { email: item.email },
                    });
                    revalidatePath("/admin/access");
                  }}
                >
                  <button type="submit" className="text-red-600 hover:text-red-800">
                    Eliminar
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}



