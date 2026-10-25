/** Fortæller browseren, hvordan den skal uploade, og til hvilken mappe (dev/ på dev-siden) */
export default defineEventHandler(() => ({ mode: uploadMode, folder: blobFolder }))
