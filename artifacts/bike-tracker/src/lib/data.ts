import { supabase } from "./supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RidingFrequency = "daily" | "several_weekly" | "weekly" | "occasional";
export type RidingStyle = "road" | "mtb" | "gravel" | "mixed";
export type ComponentType =
  | "chain" | "cassette" | "chainring"
  | "front_sealant" | "rear_sealant"
  | "front_brake_rotors" | "rear_brake_rotors"
  | "front_brake_pads" | "rear_brake_pads"
  | "front_tire" | "rear_tire";

export interface Bike {
  id: number;
  userId: string;
  ownerUsername: string;
  name: string;
  themeIndex: number;
  ridingFrequency: string;
  ridingStyle: string;
  hoursPerWeek: number;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
  specFrame: string | null;
  specFork: string | null;
  specRims: string | null;
  specHandlebars: string | null;
  specSeat: string | null;
  specGroupset: string | null;
  specPedals: string | null;
  customSpecs: Record<string, string>;
}

export interface Component {
  id: number;
  bikeId: number;
  componentType: string;
  installedAt: string;
  lifespanDays: number | null;
  brandModel: string | null;
  notes: string | null;
  daysInstalled: number;
  estimatedReplacementDays: number;
  percentUsed: number;
  status: "good" | "warning" | "replace";
  isLifetime: boolean;
}

// ── Lifespan calculation (mirrors what the API server used to do) ─────────────

const BASE_LIFESPAN_DAYS: Record<ComponentType, number> = {
  chain: 90, cassette: 180, chainring: 365,
  front_sealant: 90, rear_sealant: 90,
  front_brake_rotors: 365, rear_brake_rotors: 365,
  front_brake_pads: 120, rear_brake_pads: 120,
  front_tire: 180, rear_tire: 150,
};

const FREQUENCY_MULTIPLIER: Record<RidingFrequency, number> = {
  daily: 1.0, several_weekly: 1.4, weekly: 2.0, occasional: 3.5,
};

const STYLE_MULTIPLIER: Record<RidingStyle, Record<ComponentType, number>> = {
  road:   { chain:1.0, cassette:1.0, chainring:1.0, front_sealant:1.3, rear_sealant:1.3, front_brake_rotors:1.2, rear_brake_rotors:1.2, front_brake_pads:1.2, rear_brake_pads:1.2, front_tire:1.0, rear_tire:1.0 },
  mtb:    { chain:0.7, cassette:0.7, chainring:0.7, front_sealant:0.55, rear_sealant:0.55, front_brake_rotors:0.6, rear_brake_rotors:0.55, front_brake_pads:0.6, rear_brake_pads:0.55, front_tire:0.7, rear_tire:0.65 },
  gravel: { chain:0.85, cassette:0.85, chainring:0.9, front_sealant:0.7, rear_sealant:0.7, front_brake_rotors:0.9, rear_brake_rotors:0.85, front_brake_pads:0.9, rear_brake_pads:0.85, front_tire:0.8, rear_tire:0.75 },
  mixed:  { chain:0.85, cassette:0.85, chainring:0.85, front_sealant:0.75, rear_sealant:0.75, front_brake_rotors:0.85, rear_brake_rotors:0.82, front_brake_pads:0.85, rear_brake_pads:0.82, front_tire:0.85, rear_tire:0.80 },
};

function computeEstimatedDays(componentType: string, bike: Bike): number {
  const base = BASE_LIFESPAN_DAYS[componentType as ComponentType] ?? 90;
  const freqMult = FREQUENCY_MULTIPLIER[bike.ridingFrequency as RidingFrequency] ?? 1.0;
  const styleMult = STYLE_MULTIPLIER[bike.ridingStyle as RidingStyle]?.[componentType as ComponentType] ?? 1.0;
  const hoursMult = Math.max(0.5, 1.0 - (bike.hoursPerWeek - 5) * 0.02);
  return Math.round(base * freqMult * styleMult * hoursMult);
}

// Parse a YYYY-MM-DD string into UTC midnight milliseconds (timezone-safe).
function utcDayMs(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

// Extract the canonical YYYY-MM-DD date from any ISO timestamp string.
// Supabase stores dates as UTC midnight, so the UTC date part is the canonical date.
function isoToDateStr(iso: string): string {
  return iso.slice(0, 10);
}

// Today's date as a UTC YYYY-MM-DD string — consistent with how we store dates.
function utcTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function enrichRow(row: Record<string, unknown>, bike: Bike): Component {
  // Always work with the canonical YYYY-MM-DD date string.
  // Supabase stores installed_at as UTC midnight, so slicing the ISO string
  // gives us the exact calendar date the user entered, timezone-agnostic.
  const dateStr = isoToDateStr(row.installed_at as string);
  const todayStr = utcTodayStr();

  // Both sides are UTC midnight — diff is always an exact whole number of days.
  const daysInstalled = Math.max(0, Math.floor((utcDayMs(todayStr) - utcDayMs(dateStr)) / 86400000));

  const isLifetime = (row.is_lifetime as boolean | null) ?? false;

  if (isLifetime) {
    return {
      id: row.id as number,
      bikeId: row.bike_id as number,
      componentType: row.component_type as string,
      installedAt: dateStr,
      lifespanDays: null,
      brandModel: (row.brand_model as string | null) ?? null,
      notes: row.notes as string | null,
      daysInstalled,
      estimatedReplacementDays: 0,
      percentUsed: 0,
      status: "good",
      isLifetime: true,
    };
  }

  const lifespanDays = row.lifespan_days as number | null;
  const estimatedReplacementDays = lifespanDays ?? computeEstimatedDays(row.component_type as string, bike);
  const percentUsed = Math.round((daysInstalled / estimatedReplacementDays) * 100);
  const status: Component["status"] = percentUsed >= 100 ? "replace" : percentUsed >= 75 ? "warning" : "good";
  return {
    id: row.id as number,
    bikeId: row.bike_id as number,
    componentType: row.component_type as string,
    installedAt: dateStr,
    lifespanDays,
    brandModel: (row.brand_model as string | null) ?? null,
    notes: row.notes as string | null,
    daysInstalled,
    estimatedReplacementDays,
    percentUsed,
    status,
    isLifetime: false,
  };
}

function mapBike(row: Record<string, unknown>, usernameMap: Record<string, string> = {}): Bike {
  const uid = row.user_id as string;
  return {
    id: row.id as number,
    userId: uid,
    ownerUsername: usernameMap[uid] ?? "Unknown",
    name: row.name as string,
    themeIndex: row.theme_index as number,
    ridingFrequency: row.riding_frequency as string,
    ridingStyle: row.riding_style as string,
    hoursPerWeek: row.hours_per_week as number,
    imageUrls: (row.image_urls as string[] | null) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    specFrame: (row.spec_frame as string | null) ?? null,
    specFork: (row.spec_fork as string | null) ?? null,
    specRims: (row.spec_rims as string | null) ?? null,
    specHandlebars: (row.spec_handlebars as string | null) ?? null,
    specSeat: (row.spec_seat as string | null) ?? null,
    specGroupset: (row.spec_groupset as string | null) ?? null,
    specPedals: (row.spec_pedals as string | null) ?? null,
    customSpecs: (row.custom_specs as Record<string, string> | null) ?? {},
  };
}

async function fetchUsernameMap(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data } = await supabase.from("profiles").select("id, username").in("id", userIds);
  const map: Record<string, string> = {};
  for (const p of (data ?? []) as { id: string; username: string }[]) {
    map[p.id] = p.username;
  }
  return map;
}

// ── Bike CRUD ─────────────────────────────────────────────────────────────────

export async function getBikes(): Promise<Bike[]> {
  const { data, error } = await supabase.from("bikes").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  const rows = data as Record<string, unknown>[];
  const userIds = [...new Set(rows.map(r => r.user_id as string))];
  const usernameMap = await fetchUsernameMap(userIds);
  return rows.map(r => mapBike(r, usernameMap));
}

export async function getBike(id: number): Promise<Bike> {
  const { data, error } = await supabase.from("bikes").select("*").eq("id", id).single();
  if (error) throw error;
  const row = data as Record<string, unknown>;
  const usernameMap = await fetchUsernameMap([row.user_id as string]);
  return mapBike(row, usernameMap);
}

export async function createBike(name: string): Promise<Bike> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("bikes")
    .insert({ name: name.slice(0, 64), theme_index: 0, riding_frequency: "weekly", riding_style: "road", hours_per_week: 5, user_id: user?.id })
    .select().single();
  if (error) throw error;
  const row = data as Record<string, unknown>;
  const usernameMap = await fetchUsernameMap([row.user_id as string]);
  return mapBike(row, usernameMap);
}

export async function updateBike(id: number, patch: {
  name?: string; themeIndex?: number; ridingFrequency?: string; ridingStyle?: string; hoursPerWeek?: number; imageUrls?: string[];
  specFrame?: string | null; specFork?: string | null; specRims?: string | null; specHandlebars?: string | null;
  specSeat?: string | null; specGroupset?: string | null; specPedals?: string | null;
  customSpecs?: Record<string, string>;
}): Promise<Bike> {
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) dbPatch.name = patch.name.slice(0, 64);
  if (patch.themeIndex !== undefined) dbPatch.theme_index = patch.themeIndex;
  if (patch.ridingFrequency !== undefined) dbPatch.riding_frequency = patch.ridingFrequency;
  if (patch.ridingStyle !== undefined) dbPatch.riding_style = patch.ridingStyle;
  if (patch.hoursPerWeek !== undefined) dbPatch.hours_per_week = patch.hoursPerWeek;
  if (patch.imageUrls !== undefined) dbPatch.image_urls = patch.imageUrls;
  if (patch.specFrame !== undefined) dbPatch.spec_frame = patch.specFrame || null;
  if (patch.specFork !== undefined) dbPatch.spec_fork = patch.specFork || null;
  if (patch.specRims !== undefined) dbPatch.spec_rims = patch.specRims || null;
  if (patch.specHandlebars !== undefined) dbPatch.spec_handlebars = patch.specHandlebars || null;
  if (patch.specSeat !== undefined) dbPatch.spec_seat = patch.specSeat || null;
  if (patch.specGroupset !== undefined) dbPatch.spec_groupset = patch.specGroupset || null;
  if (patch.specPedals !== undefined) dbPatch.spec_pedals = patch.specPedals || null;
  if (patch.customSpecs !== undefined) dbPatch.custom_specs = patch.customSpecs;
  const { data, error } = await supabase.from("bikes").update(dbPatch).eq("id", id).select().single();
  if (error) throw error;
  const row = data as Record<string, unknown>;
  const usernameMap = await fetchUsernameMap([row.user_id as string]);
  return mapBike(row, usernameMap);
}

export async function deleteBike(id: number): Promise<void> {
  await supabase.from("bike_components").delete().eq("bike_id", id);
  const { error } = await supabase.from("bikes").delete().eq("id", id);
  if (error) throw error;
}

// ── Component CRUD ────────────────────────────────────────────────────────────

export async function getComponents(bikeId: number, bike: Bike): Promise<Component[]> {
  const { data, error } = await supabase
    .from("bike_components").select("*").eq("bike_id", bikeId).order("component_type");
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(row => enrichRow(row, bike));
}

export async function saveComponent(args: {
  componentId?: number;
  bikeId: number;
  componentType: string;
  installedAt: string;
  lifespanDays: number | null;
  brandModel: string | null;
  notes: string | null;
  isLifetime: boolean;
  bike: Bike;
}): Promise<Component> {
  const { componentId, bikeId, componentType, installedAt, lifespanDays, brandModel, notes, isLifetime, bike } = args;
  const payload = {
    bike_id: bikeId,
    component_type: componentType,
    installed_at: installedAt, // YYYY-MM-DD — stored as UTC midnight by Supabase
    lifespan_days: isLifetime ? null : lifespanDays,
    brand_model: brandModel,
    notes,
    is_lifetime: isLifetime,
    updated_at: new Date().toISOString(),
  };
  let row: Record<string, unknown>;
  if (componentId) {
    const { data, error } = await supabase.from("bike_components").update(payload).eq("id", componentId).select().single();
    if (error) throw error;
    row = data as Record<string, unknown>;
  } else {
    const { data, error } = await supabase.from("bike_components").insert(payload).select().single();
    if (error) throw error;
    row = data as Record<string, unknown>;
  }
  return enrichRow(row, bike);
}

export async function deleteComponent(componentId: number): Promise<void> {
  const { error } = await supabase.from("bike_components").delete().eq("id", componentId);
  if (error) throw error;
}

// ── Activity feed ──────────────────────────────────────────────────────────

export interface Activity {
  id: number;
  user_id: string;
  username: string;
  action: string;
  bike_name: string | null;
  bike_id: number | null;
  created_at: string;
}

function rowToActivity(r: Record<string, unknown>): Activity {
  return {
    id: r.id as number,
    user_id: r.user_id as string,
    username: r.username as string,
    action: r.action as string,
    bike_name: r.bike_name as string | null,
    bike_id: (r.bike_id as number | null) ?? null,
    created_at: r.created_at as string,
  };
}

export async function getActivities(limit = 30): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(rowToActivity);
}

export async function insertActivity(action: string, bikeName: string | null, bikeId: number | null = null): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase
    .from("profiles").select("username").eq("id", user.id).single();
  const username = (profile as { username: string } | null)?.username ?? "Unknown";
  await supabase.from("activities").insert({ user_id: user.id, username, action, bike_name: bikeName, bike_id: bikeId });
}

// ── Bike photo storage ─────────────────────────────────────────────────────

async function compressImage(file: File, maxDim = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height / width) * maxDim);
          width = maxDim;
        } else {
          width = Math.round((width / height) * maxDim);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not available")); return; }
      ctx.drawImage(img, 0, 0, width, height);

      const finish = (blob: Blob, mime: string) => {
        const mb = (b: number) => (b / 1048576).toFixed(2);
        console.log(
          `[Photo Upload] Original Size: ${mb(file.size)} MB → Compressed Size (${mime}): ${mb(blob.size)} MB` +
          ` (${Math.round((1 - blob.size / file.size) * 100)}% reduction)`
        );
        const ext = mime === "image/webp" ? "webp" : "jpg";
        resolve(new File([blob], `photo.${ext}`, { type: mime }));
      };

      canvas.toBlob(webpBlob => {
        if (webpBlob && webpBlob.type === "image/webp") {
          finish(webpBlob, "image/webp");
        } else {
          canvas.toBlob(jpegBlob => {
            if (!jpegBlob) { reject(new Error("Compression failed")); return; }
            finish(jpegBlob, "image/jpeg");
          }, "image/jpeg", quality);
        }
      }, "image/webp", quality);
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = objectUrl;
  });
}

export async function uploadBikeImage(bikeId: number, file: File): Promise<string> {
  const compressed = await compressImage(file);
  const ext = compressed.name.split(".").pop() ?? "webp";
  const path = `bikes/${bikeId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from("bike-images")
    .upload(path, compressed, { contentType: compressed.type });
  if (error) throw error;
  const { data } = supabase.storage.from("bike-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteBikeImageFromStorage(publicUrl: string): Promise<void> {
  const path = publicUrl.split("/bike-images/")[1];
  if (!path) return;
  const { error } = await supabase.storage.from("bike-images").remove([path]);
  if (error) throw error;
}

// ── Ride Logs ──────────────────────────────────────────────────────────────

export interface RideLog {
  id: number;
  profileId: string;
  username: string;
  bikeId: number;
  bikeName: string;
  mileage: number;
  notes: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export function cropToSquare(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const size = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const offsetX = (img.naturalWidth - size) / 2;
      const offsetY = (img.naturalHeight - size) / 2;
      ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error("Failed to crop image")); return; }
          resolve(new File([blob], file.name, { type: blob.type }));
        },
        file.type === "image/png" ? "image/png" : "image/jpeg",
        0.92,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Failed to load image")); };
    img.src = objectUrl;
  });
}

// ── Crews ─────────────────────────────────────────────────────────────────────

export interface CrewTheme {
  background: string;
  surface: string;
  text: string;
  accent: string;
}

export interface Crew {
  id: string;
  name: string;
  location: string | null;
  bannerImageUrl: string | null;
  bannerImages: string[];
  inviteCode: string;
  adminId: string;
  themeSettings: CrewTheme | null;
}

export async function getCrews(): Promise<Crew[]> {
  const { data, error } = await supabase
    .from("crews")
    .select("id, name, location, banner_image_url, banner_images, invite_code, admin_id, theme_settings")
    .order("name");
  if (error) {
    console.warn("[getCrews] Supabase error:", error.message);
    return [];
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    location: (r.location as string | null) ?? null,
    bannerImageUrl: (r.banner_image_url as string | null) ?? null,
    bannerImages: (r.banner_images as string[] | null) ?? [],
    inviteCode: r.invite_code as string,
    adminId: r.admin_id as string,
    themeSettings: (r.theme_settings as CrewTheme | null) ?? null,
  }));
}

function generateCrewInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createCrew(
  name: string,
  location: string | null,
  bannerFile: File | null
): Promise<{ success: boolean; crewId?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  let bannerImageUrl: string | null = null;
  if (bannerFile) {
    try {
      const compressed = await compressImage(bannerFile);
      const ext = compressed.name.split(".").pop() ?? "webp";
      const path = `crews/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("bike-images")
        .upload(path, compressed, { contentType: compressed.type });
      if (uploadError) return { success: false, error: "Image upload failed — try again" };
      const { data: urlData } = supabase.storage.from("bike-images").getPublicUrl(path);
      bannerImageUrl = urlData.publicUrl;
    } catch {
      return { success: false, error: "Image upload failed — try again" };
    }
  }

  const inviteCode = generateCrewInviteCode();

  const { data: crew, error: crewError } = await supabase
    .from("crews")
    .insert({
      name: name.trim(),
      location: location?.trim() || null,
      banner_image_url: bannerImageUrl,
      invite_code: inviteCode,
      admin_id: user.id,
    })
    .select("id")
    .single();

  if (crewError || !crew) {
    return { success: false, error: crewError?.message ?? "Could not create crew" };
  }

  const crewId = (crew as Record<string, unknown>).id as string;

  const { error: memberError } = await supabase
    .from("crew_members")
    .insert({ crew_id: crewId, user_id: user.id });

  if (memberError) {
    return { success: false, error: "Crew created but failed to add you as a member — try again" };
  }

  return { success: true, crewId };
}

export async function getCrewById(crewId: string): Promise<Crew | null> {
  const { data, error } = await supabase
    .from("crews")
    .select("id, name, location, banner_image_url, banner_images, invite_code, admin_id, theme_settings")
    .eq("id", crewId)
    .maybeSingle();
  if (error || !data) return null;
  const r = data as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    location: (r.location as string | null) ?? null,
    bannerImageUrl: (r.banner_image_url as string | null) ?? null,
    bannerImages: (r.banner_images as string[] | null) ?? [],
    inviteCode: r.invite_code as string,
    adminId: r.admin_id as string,
    themeSettings: (r.theme_settings as CrewTheme | null) ?? null,
  };
}

export async function updateCrewTheme(
  crewId: string,
  theme: CrewTheme,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("crews")
    .update({ theme_settings: theme })
    .eq("id", crewId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateCrewImages(
  crewId: string,
  newFiles: File[],
  existingUrls: string[],
): Promise<{ success: boolean; error?: string }> {
  const newUrls: string[] = [];
  for (const file of newFiles) {
    try {
      const compressed = await compressImage(file);
      const ext = compressed.name.split(".").pop() ?? "webp";
      const path = `crews/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("bike-images")
        .upload(path, compressed, { contentType: compressed.type });
      if (uploadError) return { success: false, error: "Image upload failed — try again" };
      const { data: urlData } = supabase.storage.from("bike-images").getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    } catch {
      return { success: false, error: "Image upload failed — try again" };
    }
  }
  const allUrls = [...existingUrls, ...newUrls];
  const { error } = await supabase
    .from("crews")
    .update({ banner_images: allUrls })
    .eq("id", crewId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Invite codes ──────────────────────────────────────────────────────────────

export async function generateInviteCode(): Promise<{ code: string } | { error: string }> {
  // Use getSession (cached) instead of getUser (server round-trip) so the
  // access token the client actually holds is what RLS sees.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { error: "Not signed in" };
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  // Explicitly pass created_by in snake_case to match the RLS policy column.
  const { error } = await supabase
    .from("invites")
    .insert({ code, created_by: session.user.id });
  if (error) return { error: error.message };
  return { code };
}

export async function checkInviteCode(code: string): Promise<{ valid: boolean }> {
  const clean = code.trim().toUpperCase();
  const { data } = await supabase
    .from("invites")
    .select("is_used")
    .eq("code", clean)
    .maybeSingle();
  if (!data || data.is_used) return { valid: false };
  return { valid: true };
}

export async function consumeInviteCode(code: string, userId: string): Promise<void> {
  await supabase
    .from("invites")
    .update({ is_used: true, used_by: userId })
    .eq("code", code.trim().toUpperCase());
}

export async function getMyCrewIds(): Promise<Set<string>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();
  const { data } = await supabase
    .from("crew_members")
    .select("crew_id")
    .eq("user_id", user.id);
  return new Set((data ?? []).map((r: Record<string, unknown>) => r.crew_id as string));
}

export interface CrewMember {
  userId: string;
  username: string;
}

export async function getCrewMembers(crewId: string): Promise<CrewMember[]> {
  const { data, error } = await supabase
    .from("crew_members")
    .select("user_id, profiles(id, username)")
    .eq("crew_id", crewId);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(r => {
    const profile = (r.profiles as Record<string, unknown> | null);
    return {
      userId: r.user_id as string,
      username: (profile?.username as string | null) ?? "Unknown",
    };
  });
}

export async function joinCrewById(crewId: string): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("crew_members")
    .select("id")
    .eq("crew_id", crewId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return { success: false, error: "You're already in this crew" };

  const { error: insertError } = await supabase
    .from("crew_members")
    .insert({ crew_id: crewId, user_id: user.id });

  if (insertError) return { success: false, error: "Could not join crew — try again" };

  return { success: true };
}

export async function joinCrew(inviteCode: string): Promise<{ success: boolean; crewName?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: crew, error: crewError } = await supabase
    .from("crews")
    .select("id, name")
    .eq("invite_code", inviteCode.trim().toUpperCase())
    .single();

  if (crewError || !crew) return { success: false, error: "Invalid invite code" };

  const { data: existing } = await supabase
    .from("crew_members")
    .select("id")
    .eq("crew_id", (crew as Record<string, unknown>).id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return { success: false, error: "You're already in this crew" };

  const { error: insertError } = await supabase
    .from("crew_members")
    .insert({ crew_id: (crew as Record<string, unknown>).id, user_id: user.id });

  if (insertError) return { success: false, error: "Could not join crew — try again" };

  return { success: true, crewName: (crew as Record<string, unknown>).name as string };
}

export async function getUserBikes(): Promise<{ id: number; name: string }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("bikes").select("id, name").eq("user_id", user.id).order("created_at");
  return (data ?? []) as { id: number; name: string }[];
}

export async function uploadRideImage(file: File): Promise<string> {
  const compressed = await compressImage(file);
  const ext = compressed.name.split(".").pop() ?? "webp";
  const path = `rides/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from("bike-images")
    .upload(path, compressed, { contentType: compressed.type });
  if (error) throw error;
  const { data } = supabase.storage.from("bike-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function insertRideLog(
  bikeId: number, mileage: number, notes: string, imageUrl: string | null,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("ride_logs").insert({
    profile_id: user.id,
    bike_id: bikeId,
    mileage,
    notes: notes.trim() || null,
    image_url: imageUrl,
  });
  if (error) throw error;
}

async function fetchRideLogRows(rows: Record<string, unknown>[]): Promise<RideLog[]> {
  const userIds = rows.map(r => r.profile_id as string);
  const usernameMap = await fetchUsernameMap(userIds);
  return rows.map(r => ({
    id: r.id as number,
    profileId: r.profile_id as string,
    username: usernameMap[r.profile_id as string] ?? "Unknown",
    bikeId: r.bike_id as number,
    bikeName: ((r.bikes as Record<string, unknown> | null)?.name as string) ?? "Unknown Bike",
    mileage: Number(r.mileage),
    notes: (r.notes as string | null) ?? null,
    imageUrl: (r.image_url as string | null) ?? null,
    createdAt: r.created_at as string,
  }));
}

export async function getRideLogsByBike(bikeId: number): Promise<RideLog[]> {
  try {
    const { data, error } = await supabase
      .from("ride_logs")
      .select("id, profile_id, bike_id, mileage, notes, image_url, created_at, bikes(name)")
      .eq("bike_id", bikeId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) { console.warn("[getRideLogsByBike] skipped:", error.message); return []; }
    return fetchRideLogRows((data ?? []) as Record<string, unknown>[]);
  } catch (e) {
    console.warn("[getRideLogsByBike] unexpected error:", e);
    return [];
  }
}

export async function getRideLogsGlobal(): Promise<RideLog[]> {
  try {
    const { data, error } = await supabase
      .from("ride_logs")
      .select("id, profile_id, bike_id, mileage, notes, image_url, created_at, bikes(name)")
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) { console.warn("[getRideLogsGlobal] skipped:", error.message); return []; }
    return fetchRideLogRows((data ?? []) as Record<string, unknown>[]);
  } catch (e) {
    console.warn("[getRideLogsGlobal] unexpected error:", e);
    return [];
  }
}

export async function getRideLogsByBikeId(bikeId: number): Promise<RideLog[]> {
  try {
    const { data, error } = await supabase
      .from("ride_logs")
      .select("id, profile_id, bike_id, mileage, notes, image_url, created_at, bikes(name)")
      .eq("bike_id", bikeId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) { console.warn("[getRideLogsByBikeId] skipped:", error.message); return []; }
    return fetchRideLogRows((data ?? []) as Record<string, unknown>[]);
  } catch (e) {
    console.warn("[getRideLogsByBikeId] unexpected error:", e);
    return [];
  }
}

// ── Crew-scoped data helpers ───────────────────────────────────────────────────

async function getCrewMemberIds(crewId: string): Promise<string[]> {
  const { data } = await supabase
    .from("crew_members")
    .select("user_id")
    .eq("crew_id", crewId);
  return (data ?? []).map((r: Record<string, unknown>) => r.user_id as string);
}

export async function getCrewBikes(crewId: string): Promise<Bike[]> {
  const memberIds = await getCrewMemberIds(crewId);
  if (memberIds.length === 0) return [];
  const { data, error } = await supabase
    .from("bikes")
    .select("*")
    .in("user_id", memberIds)
    .order("created_at", { ascending: true });
  if (error) { console.warn("[getCrewBikes]", error.message); return []; }
  const rows = (data ?? []) as Record<string, unknown>[];
  const usernameMap = await fetchUsernameMap(memberIds);
  return rows.map(r => mapBike(r, usernameMap));
}

export async function getCrewActivities(crewId: string): Promise<Activity[]> {
  const memberIds = await getCrewMemberIds(crewId);
  if (memberIds.length === 0) return [];
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .in("user_id", memberIds)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) { console.warn("[getCrewActivities]", error.message); return []; }
  return ((data ?? []) as Record<string, unknown>[]).map(rowToActivity);
}

export async function getRideLogsCrew(crewId: string): Promise<RideLog[]> {
  const memberIds = await getCrewMemberIds(crewId);
  if (memberIds.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from("ride_logs")
      .select("id, profile_id, bike_id, mileage, notes, image_url, created_at, bikes(name)")
      .in("profile_id", memberIds)
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) { console.warn("[getRideLogsCrew]", error.message); return []; }
    return fetchRideLogRows((data ?? []) as Record<string, unknown>[]);
  } catch (e) {
    console.warn("[getRideLogsCrew] unexpected error:", e);
    return [];
  }
}

// ── Crew messages ─────────────────────────────────────────────────────────────

export interface CrewMessage {
  id: number;
  crewId: string;
  profileId: string;
  username: string;
  messageText: string;
  createdAt: string;
}

export async function getCrewMessages(crewId: string): Promise<CrewMessage[]> {
  const { data, error } = await supabase
    .from("crew_messages")
    .select("id, crew_id, profile_id, content, created_at, profiles(username)")
    .eq("crew_id", crewId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) { console.warn("[getCrewMessages]", error.message); return []; }
  return ((data ?? []) as Record<string, unknown>[]).map(r => ({
    id: r.id as number,
    crewId: r.crew_id as string,
    profileId: r.profile_id as string,
    username: ((r.profiles as Record<string, unknown> | null)?.username as string) ?? "Unknown",
    messageText: r.content as string,
    createdAt: r.created_at as string,
  }));
}

export async function sendCrewMessage(
  crewId: string,
  messageText: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not signed in" };
  const { error } = await supabase.from("crew_messages").insert({
    crew_id: crewId,
    profile_id: user.id,
    content: messageText.trim(),
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── Community Rides ───────────────────────────────────────────────────────────

export interface CrewRide {
  id: number;
  crewId: string;
  createdBy: string;
  title: string;
  rideDate: string;        // YYYY-MM-DD — stored directly, never converted through Date()
  rideTime: string | null; // "HH:MM:SS" from Postgres time, or null
  location: string | null;
  description: string | null;
  crewName: string;
  crewBannerUrl: string | null;
  rsvpCount: number;
  rsvpUserIds: string[];
}

function mapCrewRideRow(r: Record<string, unknown>): CrewRide {
  const crew = (r.crews as Record<string, unknown> | null);
  const rsvps = (r.ride_rsvps as Record<string, unknown>[] | null) ?? [];
  const bannerImages = (crew?.banner_images as string[] | null) ?? [];
  const bannerImageUrl = (crew?.banner_image_url as string | null) ?? null;
  return {
    id: r.id as number,
    crewId: r.crew_id as string,
    createdBy: r.created_by as string,
    title: r.title as string,
    rideDate: r.ride_date as string,
    rideTime: (r.ride_time as string | null) ?? null,
    location: (r.location as string | null) ?? null,
    description: (r.description as string | null) ?? null,
    crewName: (crew?.name as string) ?? "Unknown Crew",
    crewBannerUrl: bannerImages[0] ?? bannerImageUrl,
    rsvpCount: rsvps.length,
    rsvpUserIds: rsvps.map(rv => rv.user_id as string),
  };
}

export async function createRide(payload: {
  crewId: string;
  title: string;
  rideDate: string;    // YYYY-MM-DD — saved directly, no TZ conversion
  rideTime: string;
  location: string;
  description: string;
}): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };
  const { error } = await supabase.from("crew_rides").insert({
    crew_id: payload.crewId,
    created_by: user.id,
    title: payload.title.trim(),
    ride_date: payload.rideDate,
    ride_time: payload.rideTime || null,
    location: payload.location.trim() || null,
    description: payload.description.trim() || null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function fetchUpcomingRides(): Promise<CrewRide[]> {
  const todayStr = new Date().toISOString().slice(0, 10);
  try {
    const { data, error } = await supabase
      .from("crew_rides")
      .select("*, crews(name, banner_images, banner_image_url), ride_rsvps(user_id)")
      .gte("ride_date", todayStr)
      .order("ride_date", { ascending: true });
    if (error) { console.warn("[fetchUpcomingRides]", error.message); return []; }
    return ((data ?? []) as Record<string, unknown>[]).map(mapCrewRideRow);
  } catch (e) {
    console.warn("[fetchUpcomingRides] unexpected:", e);
    return [];
  }
}

export async function fetchCrewRides(crewId: string): Promise<CrewRide[]> {
  const todayStr = new Date().toISOString().slice(0, 10);
  try {
    const { data, error } = await supabase
      .from("crew_rides")
      .select("*, crews(name, banner_images, banner_image_url), ride_rsvps(user_id)")
      .eq("crew_id", crewId)
      .gte("ride_date", todayStr)
      .order("ride_date", { ascending: true });
    if (error) { console.warn("[fetchCrewRides]", error.message); return []; }
    return ((data ?? []) as Record<string, unknown>[]).map(mapCrewRideRow);
  } catch (e) {
    console.warn("[fetchCrewRides] unexpected:", e);
    return [];
  }
}

export async function toggleRSVP(
  rideId: number,
  userId: string,
): Promise<{ going: boolean; error?: string }> {
  const { data: existing } = await supabase
    .from("ride_rsvps")
    .select("ride_id")
    .eq("ride_id", rideId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("ride_rsvps")
      .delete()
      .eq("ride_id", rideId)
      .eq("user_id", userId);
    if (error) return { going: true, error: error.message };
    return { going: false };
  } else {
    const { error } = await supabase
      .from("ride_rsvps")
      .insert({ ride_id: rideId, user_id: userId });
    if (error) return { going: false, error: error.message };
    return { going: true };
  }
}
