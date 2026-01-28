import { Router, Request, Response } from "express";
import { db } from "./db";
import { countries, regions, provinces, cities } from "@shared/schema";
import { eq, and, ilike, sql, asc } from "drizzle-orm";

const router = Router();

// GET /api/geo/countries - Get all active countries
router.get("/api/geo/countries", async (req: Request, res: Response) => {
  try {
    const result = await db.select()
      .from(countries)
      .where(eq(countries.isActive, true))
      .orderBy(asc(countries.sortOrder), asc(countries.name));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/geo/regions/:countryId - Get regions for a country
router.get("/api/geo/regions/:countryId", async (req: Request, res: Response) => {
  try {
    const { countryId } = req.params;
    const result = await db.select()
      .from(regions)
      .where(and(eq(regions.countryId, countryId), eq(regions.isActive, true)))
      .orderBy(asc(regions.sortOrder), asc(regions.name));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/geo/regions/by-code/:countryCode - Get regions by country code (e.g., IT)
router.get("/api/geo/regions/by-code/:countryCode", async (req: Request, res: Response) => {
  try {
    const { countryCode } = req.params;
    const [country] = await db.select().from(countries).where(eq(countries.code, countryCode.toUpperCase()));
    if (!country) {
      return res.json([]);
    }
    const result = await db.select()
      .from(regions)
      .where(and(eq(regions.countryId, country.id), eq(regions.isActive, true)))
      .orderBy(asc(regions.sortOrder), asc(regions.name));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/geo/provinces/all - Get all provinces (for dropdown) - MUST come before :regionId
router.get("/api/geo/provinces/all", async (req: Request, res: Response) => {
  try {
    const result = await db.select({
      province: provinces,
      region: {
        id: regions.id,
        name: regions.name,
        code: regions.code,
      },
    })
      .from(provinces)
      .innerJoin(regions, eq(provinces.regionId, regions.id))
      .where(eq(provinces.isActive, true))
      .orderBy(asc(provinces.name));
    res.json(result.map(r => ({
      ...r.province,
      regionName: r.region.name,
      regionCode: r.region.code,
    })));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/geo/provinces/:regionId - Get provinces for a region
router.get("/api/geo/provinces/:regionId", async (req: Request, res: Response) => {
  try {
    const { regionId } = req.params;
    const result = await db.select()
      .from(provinces)
      .where(and(eq(provinces.regionId, regionId), eq(provinces.isActive, true)))
      .orderBy(asc(provinces.sortOrder), asc(provinces.name));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/geo/cities/:provinceId - Get cities for a province
router.get("/api/geo/cities/:provinceId", async (req: Request, res: Response) => {
  try {
    const { provinceId } = req.params;
    const result = await db.select()
      .from(cities)
      .where(and(eq(cities.provinceId, provinceId), eq(cities.isActive, true)))
      .orderBy(asc(cities.name));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/geo/cities/search - Search cities by name
router.get("/api/geo/cities/search", async (req: Request, res: Response) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q || String(q).length < 2) {
      return res.json([]);
    }
    const result = await db.select({
      city: cities,
      province: {
        id: provinces.id,
        name: provinces.name,
        code: provinces.code,
      },
      region: {
        id: regions.id,
        name: regions.name,
      },
    })
      .from(cities)
      .innerJoin(provinces, eq(cities.provinceId, provinces.id))
      .innerJoin(regions, eq(provinces.regionId, regions.id))
      .where(and(ilike(cities.name, `${q}%`), eq(cities.isActive, true)))
      .orderBy(asc(cities.name))
      .limit(Number(limit));
    
    res.json(result.map(r => ({
      ...r.city,
      provinceName: r.province.name,
      provinceCode: r.province.code,
      regionName: r.region.name,
    })));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/geo/seed - Seed Italian geography data (admin only)
router.post("/api/geo/seed", async (req: Request, res: Response) => {
  try {
    // Check if already seeded
    const existingCountries = await db.select().from(countries).limit(1);
    if (existingCountries.length > 0) {
      return res.json({ message: "Dati già presenti", seeded: false });
    }

    // Insert Italy
    const [italy] = await db.insert(countries).values({
      code: "IT",
      name: "Italia",
      nameEn: "Italy",
      phoneCode: "+39",
      isActive: true,
      sortOrder: 1,
    }).returning();

    // Italian regions with ISTAT codes
    const italianRegions = [
      { code: "PIE", name: "Piemonte", istatCode: "01" },
      { code: "VDA", name: "Valle d'Aosta", istatCode: "02" },
      { code: "LOM", name: "Lombardia", istatCode: "03" },
      { code: "TAA", name: "Trentino-Alto Adige", istatCode: "04" },
      { code: "VEN", name: "Veneto", istatCode: "05" },
      { code: "FVG", name: "Friuli-Venezia Giulia", istatCode: "06" },
      { code: "LIG", name: "Liguria", istatCode: "07" },
      { code: "EMR", name: "Emilia-Romagna", istatCode: "08" },
      { code: "TOS", name: "Toscana", istatCode: "09" },
      { code: "UMB", name: "Umbria", istatCode: "10" },
      { code: "MAR", name: "Marche", istatCode: "11" },
      { code: "LAZ", name: "Lazio", istatCode: "12" },
      { code: "ABR", name: "Abruzzo", istatCode: "13" },
      { code: "MOL", name: "Molise", istatCode: "14" },
      { code: "CAM", name: "Campania", istatCode: "15" },
      { code: "PUG", name: "Puglia", istatCode: "16" },
      { code: "BAS", name: "Basilicata", istatCode: "17" },
      { code: "CAL", name: "Calabria", istatCode: "18" },
      { code: "SIC", name: "Sicilia", istatCode: "19" },
      { code: "SAR", name: "Sardegna", istatCode: "20" },
    ];

    const insertedRegions = await db.insert(regions).values(
      italianRegions.map((r, i) => ({
        countryId: italy.id,
        code: r.code,
        name: r.name,
        istatCode: r.istatCode,
        isActive: true,
        sortOrder: i + 1,
      }))
    ).returning();

    // Create a map of region codes to IDs
    const regionMap: Record<string, string> = {};
    insertedRegions.forEach(r => {
      regionMap[r.code] = r.id;
    });

    // Italian provinces with their regions
    const italianProvinces = [
      // Piemonte
      { regionCode: "PIE", code: "TO", name: "Torino" },
      { regionCode: "PIE", code: "VC", name: "Vercelli" },
      { regionCode: "PIE", code: "NO", name: "Novara" },
      { regionCode: "PIE", code: "CN", name: "Cuneo" },
      { regionCode: "PIE", code: "AT", name: "Asti" },
      { regionCode: "PIE", code: "AL", name: "Alessandria" },
      { regionCode: "PIE", code: "BI", name: "Biella" },
      { regionCode: "PIE", code: "VB", name: "Verbano-Cusio-Ossola" },
      // Valle d'Aosta
      { regionCode: "VDA", code: "AO", name: "Aosta" },
      // Lombardia
      { regionCode: "LOM", code: "VA", name: "Varese" },
      { regionCode: "LOM", code: "CO", name: "Como" },
      { regionCode: "LOM", code: "SO", name: "Sondrio" },
      { regionCode: "LOM", code: "MI", name: "Milano" },
      { regionCode: "LOM", code: "BG", name: "Bergamo" },
      { regionCode: "LOM", code: "BS", name: "Brescia" },
      { regionCode: "LOM", code: "PV", name: "Pavia" },
      { regionCode: "LOM", code: "CR", name: "Cremona" },
      { regionCode: "LOM", code: "MN", name: "Mantova" },
      { regionCode: "LOM", code: "LC", name: "Lecco" },
      { regionCode: "LOM", code: "LO", name: "Lodi" },
      { regionCode: "LOM", code: "MB", name: "Monza e della Brianza" },
      // Trentino-Alto Adige
      { regionCode: "TAA", code: "BZ", name: "Bolzano" },
      { regionCode: "TAA", code: "TN", name: "Trento" },
      // Veneto
      { regionCode: "VEN", code: "VR", name: "Verona" },
      { regionCode: "VEN", code: "VI", name: "Vicenza" },
      { regionCode: "VEN", code: "BL", name: "Belluno" },
      { regionCode: "VEN", code: "TV", name: "Treviso" },
      { regionCode: "VEN", code: "VE", name: "Venezia" },
      { regionCode: "VEN", code: "PD", name: "Padova" },
      { regionCode: "VEN", code: "RO", name: "Rovigo" },
      // Friuli-Venezia Giulia
      { regionCode: "FVG", code: "UD", name: "Udine" },
      { regionCode: "FVG", code: "GO", name: "Gorizia" },
      { regionCode: "FVG", code: "TS", name: "Trieste" },
      { regionCode: "FVG", code: "PN", name: "Pordenone" },
      // Liguria
      { regionCode: "LIG", code: "IM", name: "Imperia" },
      { regionCode: "LIG", code: "SV", name: "Savona" },
      { regionCode: "LIG", code: "GE", name: "Genova" },
      { regionCode: "LIG", code: "SP", name: "La Spezia" },
      // Emilia-Romagna
      { regionCode: "EMR", code: "PC", name: "Piacenza" },
      { regionCode: "EMR", code: "PR", name: "Parma" },
      { regionCode: "EMR", code: "RE", name: "Reggio Emilia" },
      { regionCode: "EMR", code: "MO", name: "Modena" },
      { regionCode: "EMR", code: "BO", name: "Bologna" },
      { regionCode: "EMR", code: "FE", name: "Ferrara" },
      { regionCode: "EMR", code: "RA", name: "Ravenna" },
      { regionCode: "EMR", code: "FC", name: "Forlì-Cesena" },
      { regionCode: "EMR", code: "RN", name: "Rimini" },
      // Toscana
      { regionCode: "TOS", code: "MS", name: "Massa-Carrara" },
      { regionCode: "TOS", code: "LU", name: "Lucca" },
      { regionCode: "TOS", code: "PT", name: "Pistoia" },
      { regionCode: "TOS", code: "FI", name: "Firenze" },
      { regionCode: "TOS", code: "LI", name: "Livorno" },
      { regionCode: "TOS", code: "PI", name: "Pisa" },
      { regionCode: "TOS", code: "AR", name: "Arezzo" },
      { regionCode: "TOS", code: "SI", name: "Siena" },
      { regionCode: "TOS", code: "GR", name: "Grosseto" },
      { regionCode: "TOS", code: "PO", name: "Prato" },
      // Umbria
      { regionCode: "UMB", code: "PG", name: "Perugia" },
      { regionCode: "UMB", code: "TR", name: "Terni" },
      // Marche
      { regionCode: "MAR", code: "PU", name: "Pesaro e Urbino" },
      { regionCode: "MAR", code: "AN", name: "Ancona" },
      { regionCode: "MAR", code: "MC", name: "Macerata" },
      { regionCode: "MAR", code: "AP", name: "Ascoli Piceno" },
      { regionCode: "MAR", code: "FM", name: "Fermo" },
      // Lazio
      { regionCode: "LAZ", code: "VT", name: "Viterbo" },
      { regionCode: "LAZ", code: "RI", name: "Rieti" },
      { regionCode: "LAZ", code: "RM", name: "Roma" },
      { regionCode: "LAZ", code: "LT", name: "Latina" },
      { regionCode: "LAZ", code: "FR", name: "Frosinone" },
      // Abruzzo
      { regionCode: "ABR", code: "AQ", name: "L'Aquila" },
      { regionCode: "ABR", code: "TE", name: "Teramo" },
      { regionCode: "ABR", code: "PE", name: "Pescara" },
      { regionCode: "ABR", code: "CH", name: "Chieti" },
      // Molise
      { regionCode: "MOL", code: "CB", name: "Campobasso" },
      { regionCode: "MOL", code: "IS", name: "Isernia" },
      // Campania
      { regionCode: "CAM", code: "CE", name: "Caserta" },
      { regionCode: "CAM", code: "BN", name: "Benevento" },
      { regionCode: "CAM", code: "NA", name: "Napoli" },
      { regionCode: "CAM", code: "AV", name: "Avellino" },
      { regionCode: "CAM", code: "SA", name: "Salerno" },
      // Puglia
      { regionCode: "PUG", code: "FG", name: "Foggia" },
      { regionCode: "PUG", code: "BA", name: "Bari" },
      { regionCode: "PUG", code: "TA", name: "Taranto" },
      { regionCode: "PUG", code: "BR", name: "Brindisi" },
      { regionCode: "PUG", code: "LE", name: "Lecce" },
      { regionCode: "PUG", code: "BT", name: "Barletta-Andria-Trani" },
      // Basilicata
      { regionCode: "BAS", code: "PZ", name: "Potenza" },
      { regionCode: "BAS", code: "MT", name: "Matera" },
      // Calabria
      { regionCode: "CAL", code: "CS", name: "Cosenza" },
      { regionCode: "CAL", code: "CZ", name: "Catanzaro" },
      { regionCode: "CAL", code: "RC", name: "Reggio Calabria" },
      { regionCode: "CAL", code: "KR", name: "Crotone" },
      { regionCode: "CAL", code: "VV", name: "Vibo Valentia" },
      // Sicilia
      { regionCode: "SIC", code: "TP", name: "Trapani" },
      { regionCode: "SIC", code: "PA", name: "Palermo" },
      { regionCode: "SIC", code: "ME", name: "Messina" },
      { regionCode: "SIC", code: "AG", name: "Agrigento" },
      { regionCode: "SIC", code: "CL", name: "Caltanissetta" },
      { regionCode: "SIC", code: "EN", name: "Enna" },
      { regionCode: "SIC", code: "CT", name: "Catania" },
      { regionCode: "SIC", code: "RG", name: "Ragusa" },
      { regionCode: "SIC", code: "SR", name: "Siracusa" },
      // Sardegna
      { regionCode: "SAR", code: "SS", name: "Sassari" },
      { regionCode: "SAR", code: "NU", name: "Nuoro" },
      { regionCode: "SAR", code: "CA", name: "Cagliari" },
      { regionCode: "SAR", code: "OR", name: "Oristano" },
      { regionCode: "SAR", code: "SU", name: "Sud Sardegna" },
    ];

    await db.insert(provinces).values(
      italianProvinces.map((p, i) => ({
        regionId: regionMap[p.regionCode],
        code: p.code,
        name: p.name,
        isActive: true,
        sortOrder: i + 1,
      }))
    );

    res.json({ 
      message: "Dati geografici italiani caricati con successo",
      seeded: true,
      countries: 1,
      regions: italianRegions.length,
      provinces: italianProvinces.length,
    });
  } catch (error: any) {
    console.error("Error seeding geo data:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
