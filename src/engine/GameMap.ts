import type { MapWall, MapRoomZone, Position } from '../types/game';

export class GameMap {
  // High-Resolution Map Dimensions matching custom Cyber Plaza image ratio (4000 x 2800)
  public static readonly MAP_WIDTH = 4000;
  public static readonly MAP_HEIGHT = 2800;

  // Open Plaza Spawn in front of the central fountain
  public static readonly SPAWN_POS: Position = { x: 2000, y: 1380 };

  // Social Room Zones
  public static readonly ROOMS: MapRoomZone[] = [
    {
      name: "Observatory",
      x: 520,
      y: 140,
      width: 960,
      height: 460,
      color: "rgba(14, 165, 233, 0.15)"
    },
    {
      name: "Rooftop",
      x: 2480,
      y: 140,
      width: 970,
      height: 460,
      color: "rgba(147, 51, 234, 0.15)"
    },
    {
      name: "Grand Plaza",
      x: 1100,
      y: 640,
      width: 1800,
      height: 1180,
      color: "rgba(59, 130, 246, 0.15)"
    },
    {
      name: "Lounge Bar",
      x: 140,
      y: 680,
      width: 950,
      height: 640,
      color: "rgba(168, 85, 247, 0.15)"
    },
    {
      name: "DJ Stage",
      x: 2880,
      y: 680,
      width: 980,
      height: 680,
      color: "rgba(236, 72, 153, 0.15)"
    },
    {
      name: "Game Room",
      x: 140,
      y: 1400,
      width: 940,
      height: 700,
      color: "rgba(99, 102, 241, 0.15)"
    },
    {
      name: "Event Hall",
      x: 1100,
      y: 1860,
      width: 1050,
      height: 660,
      color: "rgba(14, 165, 233, 0.15)"
    },
    {
      name: "Chill Room",
      x: 2180,
      y: 1860,
      width: 720,
      height: 660,
      color: "rgba(16, 185, 129, 0.15)"
    },
    {
      name: "Cafe",
      x: 2920,
      y: 1440,
      width: 940,
      height: 600,
      color: "rgba(245, 158, 11, 0.15)"
    },
    {
      name: "Voice Pods",
      x: 2920,
      y: 2060,
      width: 940,
      height: 460,
      color: "rgba(249, 115, 22, 0.15)"
    }
  ];

  // Walls & Solid Obstacles matching exact image graphic doorways & furniture
  public static readonly WALLS: MapWall[] = [
    // Outer Border Boundaries
    { x: 0, y: 0, width: 4000, height: 60 },
    { x: 0, y: 2740, width: 4000, height: 60 },
    { x: 0, y: 0, width: 60, height: 2800 },
    { x: 3940, y: 0, width: 60, height: 2800 },

    // --- Observatory Walls ---
    { x: 520, y: 140, width: 30, height: 460 },
    { x: 1450, y: 140, width: 30, height: 460 },
    { x: 520, y: 570, width: 380, height: 30 },
    { x: 1100, y: 570, width: 380, height: 30 },

    // --- Rooftop Walls ---
    { x: 2480, y: 140, width: 30, height: 460 },
    { x: 3420, y: 140, width: 30, height: 460 },
    { x: 2480, y: 570, width: 380, height: 30 },
    { x: 3060, y: 570, width: 390, height: 30 },

    // --- Lounge Bar Walls & Furniture ---
    { x: 140, y: 680, width: 950, height: 30 }, // Top wall
    { x: 140, y: 680, width: 30, height: 640 }, // Left wall
    { x: 140, y: 1290, width: 380, height: 30 },
    { x: 710, y: 1290, width: 380, height: 30 }, // Bottom wall with entrance (520..710)
    { x: 1060, y: 680, width: 30, height: 260 },
    { x: 1060, y: 1140, width: 30, height: 180 },// Right wall with wide Doorway at Y: 940..1140 (Pink neon arrows!)
    { x: 300, y: 720, width: 620, height: 130 }, // Bar Counter & Stools
    { x: 520, y: 980, width: 190, height: 150 }, // Center Sofa Grouping
    { x: 330, y: 1000, width: 120, height: 120 },// Left Round Table
    { x: 750, y: 1000, width: 120, height: 120 },// Right Round Table

    // --- DJ Stage Walls ---
    { x: 2880, y: 680, width: 980, height: 30 },
    { x: 3830, y: 680, width: 30, height: 680 },
    { x: 2880, y: 1330, width: 980, height: 30 },
    { x: 2880, y: 680, width: 30, height: 260 },
    { x: 2880, y: 1140, width: 30, height: 220 }, // Wide Doorway at Y: 940..1140 (Pink neon arrows!)
    { x: 3200, y: 730, width: 450, height: 90 },  // DJ Stage obstacle

    // --- Game Room Walls & Furniture ---
    { x: 140, y: 1400, width: 940, height: 30 }, // Top wall
    { x: 140, y: 1400, width: 30, height: 700 }, // Left wall
    { x: 140, y: 2070, width: 350, height: 30 },
    { x: 670, y: 2070, width: 410, height: 30 }, // Bottom wall with exit doorway (490..670)
    { x: 1050, y: 1400, width: 30, height: 670 },// Right wall
    { x: 430, y: 1650, width: 230, height: 150 },// Center Pool Table
    { x: 770, y: 1670, width: 110, height: 160 },// Foosball Table
    { x: 180, y: 1540, width: 120, height: 440 },// Arcade Cabinets Row
    { x: 670, y: 1440, width: 230, height: 100 },// Pinball & Drinks Vending

    // --- Event Hall Walls ---
    { x: 1100, y: 1860, width: 320, height: 30 },
    { x: 1780, y: 1860, width: 370, height: 30 }, // OPEN ENTRANCE DOORWAY (1420..1780)
    { x: 1100, y: 1860, width: 30, height: 660 },
    { x: 2120, y: 1860, width: 30, height: 660 },
    { x: 1100, y: 2490, width: 320, height: 30 },
    { x: 1780, y: 2490, width: 370, height: 30 }, // Bottom exit doorway

    // --- Chill Room Walls ---
    { x: 2180, y: 1860, width: 140, height: 30 },
    { x: 2680, y: 1860, width: 220, height: 30 }, // OPEN ENTRANCE DOORWAY (2320..2680)
    { x: 2180, y: 1860, width: 30, height: 660 },
    { x: 2870, y: 1860, width: 30, height: 660 },
    { x: 2180, y: 2490, width: 140, height: 30 },
    { x: 2680, y: 2490, width: 220, height: 30 },

    // --- Cafe Walls ---
    { x: 2920, y: 1440, width: 940, height: 30 },
    { x: 3830, y: 1440, width: 30, height: 600 },
    { x: 2920, y: 1440, width: 30, height: 120 },
    { x: 2920, y: 1800, width: 30, height: 240 },
    { x: 3100, y: 1520, width: 450, height: 70 }, // Coffee Counter

    // --- Voice Pods Walls ---
    { x: 2920, y: 2060, width: 940, height: 30 },
    { x: 2920, y: 2060, width: 30, height: 460 },
    { x: 3830, y: 2060, width: 30, height: 460 },
    { x: 2920, y: 2490, width: 940, height: 30 },

    // Central Fountain Obstacle
    { x: 1920, y: 1100, width: 160, height: 160 },
  ];

  /**
   * Check if player dot collides with any wall obstacle
   */
  public static checkCollision(x: number, y: number, radius: number = 18): boolean {
    if (x - radius < 60 || x + radius > this.MAP_WIDTH - 60 ||
        y - radius < 60 || y + radius > this.MAP_HEIGHT - 60) {
      return true;
    }

    for (const wall of this.WALLS) {
      const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
      const distanceX = x - closestX;
      const distanceY = y - closestY;
      const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

      if (distanceSquared < (radius * radius)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get current room name based on player coordinates
   */
  public static getCurrentRoom(x: number, y: number): string {
    for (const room of this.ROOMS) {
      if (x >= room.x && x <= room.x + room.width &&
          y >= room.y && y <= room.y + room.height) {
        return room.name;
      }
    }
    return 'Grand Plaza';
  }
}
