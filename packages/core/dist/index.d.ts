import { z } from 'zod';

declare const KitId: z.ZodEnum<["nextjs-golden", "vite-react", "fastapi"]>;
type KitId = z.infer<typeof KitId>;
type Kit = {
    id: KitId;
    name: string;
    runtime: "node24" | "node22" | "python3.13";
    ports: number[];
    /** directory under /vercel/sandbox where the kit app lives */
    appDir: string;
    /** commands to prepare the sandbox filesystem + install deps */
    setup: Array<{
        cmd: string;
        cwd?: string;
        sudo?: boolean;
    }>;
    /** command to start the dev server (should be detached) */
    dev: {
        cmd: string;
        cwd?: string;
    };
    /** command to validate after changes */
    check: {
        cmd: string;
        cwd?: string;
    };
};
declare const kits: Record<KitId, Kit>;

export { type Kit, KitId, kits };
