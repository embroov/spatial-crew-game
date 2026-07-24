import type { MapWall, MapRoomZone, Position } from '../types/game';

export class GameMap {
  // High-Resolution Map Dimensions matching custom Cyber Plaza image ratio (4000 x 2800)
  public static readonly MAP_WIDTH = 4000;
  public static readonly MAP_HEIGHT = 2800;

  // Open Plaza Spawn in front of the central fountain
  public static readonly SPAWN_POS: Position = { x: 2000, y: 1380 };

  // Social Room Zones matching the exact map image layout
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

  // Walls & Solid Obstacles matching exact image graphic doorways
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
    { x: 1100, y: 570, width: 380, height: 30 }, // Stairs entrance doorway

    // --- Rooftop Walls ---
    { x: 2480, y: 140, width: 30, height: 460 },
    { x: 3420, y: 140, width: 30, height: 460 },
    { x: 2480, y: 570, width: 380, height: 30 },
    { x: 3060, y: 570, width: 390, height: 30 }, // Stairs entrance doorway

    // --- Lounge Bar Walls ---
    { x: 140, y: 680, width: 950, height: 30 }, // Solid top wall
    { x: 140, y: 680, width: 30, height: 640 }, // Solid left wall
    { x: 140, y: 1290, width: 950, height: 30 },// Bottom wall
    { x: 1060, y: 680, width: 30, height: 160 }, // Right wall top portion
    { x: 1060, y: 1120, width: 30, height: 200 },// Right wall bottom portion (Wide Doorway at Y: 840..1120 aligned with pink neon arrows!)
    { x: 300, y: 780, width: 500, height: 70 },  // Bar Counter obstacle

    // --- DJ Stage Walls ---
    { x: 2880, y: 680, width: 980, height: 30 },
    { x: 3830, y: 680, width: 30, height: 680 },
    { x: 2880, y: 1330, width: 980, height: 30 },
    { x: 2880, y: 680, width: 30, height: 160 },
    { x: 2880, y: 1120, width: 30, height: 240 }, // Wide Doorway at Y: 840..1120 aligned with pink neon arrows!
    { x: 3200, y: 730, width: 450, height: 90 },  // DJ Stage obstacle

    // --- Game Room Walls ---
    { x: 140, y: 1400, width: 940, height: 30 },
    { x: 140, y: 1400, width: 30, height: 700 },
    { x: 140, y: 2070, width: 940, height: 30 },
    { x: 1050, y: 1400, width: 30, height: 160 },
    { x: 1050, y: 1820, width: 30, height: 280 }, // Doorway (1560..1820)
    { x: 450, y: 1650, width: 300, height: 150 }, // Pool Table

    // --- Event Hall Walls (FIXED ENTRANCE DOORWAY) ---
    { x: 1100, y: 1860, width: 320, height: 30 },
    { x: 1780, y: 1860, width: 370, height: 30 }, // OPEN ENTRANCE DOORWAY at X: 1420..1780 (Blue neon arrows!)
    { x: 1100, y: 1860, width: 30, height: 660 },
    { x: 2120, y: 1860, width: 30, height: 660 },
    { x: 1100, y: 2490, width: 320, height: 30 },
    { x: 1780, y: 2490, width: 370, height: 30 }, // Bottom exit doorway
    { x: 1400, y: 1930, width: 450, height: 100 },// Stage Screen obstacle

    // --- Chill Room Walls (FIXED ENTRANCE DOORWAY) ---
    { x: 2180, y: 1860, width: 140, height: 30 },
    { x: 2680, y: 1860, width: 220, height: 30 }, // OPEN ENTRANCE DOORWAY at X: 2320..2680 (Green neon arrows!)
    { x: 2180, y: 1860, width: 30, height: 660 },
    { x: 2870, y: 1860, width: 30, height: 660 },
    { x: 2180, y: 2490, width: 140, height: 30 },
    { x: 2680, y: 2490, width: 220, height: 30 }, // Bottom exit doorway

    // --- Cafe Walls ---
    { x: 2920, y: 1440, width: 940, height: 30 },
    { x: 3830, y: 1440, width: 30, height: 600 },
    { x: 2920, y: 1440, width: 30, height: 120 },
    { x: 2920, y: 1800, width: 30, height: 240 }, // Left Doorway at Y: 1560..1800 (Orange neon arrows!)
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
