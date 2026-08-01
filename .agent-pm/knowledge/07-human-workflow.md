# Human-in-the-loop Workflow

## Tools yang Digunakan
1. Claude (chat terpisah) — orkestrator/PM: planning, analisis, review desain, decision-making
2. OpenCode Desktop — verifikasi & testing: baca kode verbatim, jalankan test PowerShell untuk backend, cek functional untuk frontend
3. Agent IDE (Antigravity, model Gemini 3.6 Flash Medium) — eksekutor build/code
4. Hermes Desktop (kamu) — working memory persisten, generate prompt terstruktur, pengganti jembatan manual antar 3 tool di atas

## Alur Kerja
1. Planning: diskusi task & scope dengan Claude
2. Discovery: Claude buat prompt investigasi -> User copy ke OpenCode -> OpenCode jelaskan kondisi data -> User bawa balik ke Claude
3. Proposal: Claude presentasi kondisi vs rencana -> User approve
4. Eksekusi: Claude buat prompt eksekusi -> User copy ke Agent IDE -> Agent IDE build code -> kasih summary
5. Review internal: Summary dibawa ke Claude untuk analisis kesesuaian spec
6. Verifikasi independen: Claude buat prompt verifikasi -> User copy ke OpenCode -> OpenCode test -> hasil dibawa balik ke Claude
7. Manual test gate: User test langsung frontend, approve
8. Wrap-up: update TODO/progress file + commit (belum push)

## Peran Hermes dalam Alur Ini
Hermes menggantikan sebagian peran User sebagai "pembawa memori manual" antar 4 tool di atas -- working memory di .agent-pm/working/ menyimpan state supaya tidak perlu dijelaskan ulang tiap sesi/pergantian model.