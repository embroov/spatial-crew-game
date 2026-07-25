import type { MapWall, MapRoomZone, Position } from '../types/game';

export class GameMap {
  // Sprawling 5000 x 3500 Cyber Metaverse Social Plaza Dimensions
  public static readonly MAP_WIDTH = 5000;
  public static readonly MAP_HEIGHT = 3500;

  // Clear Open Floor Spawn safely in front of Central Plaza Fountain
  public static readonly SPAWN_POS: Position = { x: 2500, y: 1850 };

  // 10 Themed Social Zones across the 5000x3500 Metaverse Plaza
  public static readonly ROOMS: MapRoomZone[] = [
    {
      name: "Central Cyber Plaza",
      x: 1800,
      y: 1000,
      width: 1400,
      height: 1200,
      color: "rgba(59, 130, 246, 0.14)"
    },
    {
      name: "VIP Skylounge & Bar",
      x: 300,
      y: 200,
      width: 1300,
      height: 900,
      color: "rgba(168, 85, 247, 0.16)"
    },
    {
      name: "Rooftop Observatory",
      x: 3400,
      y: 200,
      width: 1300,
      height: 900,
      color: "rgba(14, 165, 233, 0.16)"
    },
    {
      name: "Neon Arcade & Gaming",
      x: 200,
      y: 1300,
      width: 1300,
      height: 1000,
      color: "rgba(34, 197, 94, 0.14)"
    },
    {
      name: "DJ Stage & Dance Floor",
      x: 3500,
      y: 1300,
      width: 1300,
      height: 1000,
      color: "rgba(236, 72, 153, 0.16)"
    },
    {
      name: "Sunset Terrace Café",
      x: 300,
      y: 2500,
      width: 1300,
      height: 800,
      color: "rgba(245, 158, 11, 0.14)"
    },
    {
      name: "Courtyard Stage",
      x: 1800,
      y: 2400,
      width: 1400,
      height: 900,
      color: "rgba(99, 102, 241, 0.14)"
    },
    {
      name: "Acoustic Chat Pods",
      x: 3400,
      y: 2500,
      width: 1300,
      height: 800,
      color: "rgba(249, 115, 22, 0.14)"
    },
    {
      name: "Zen Chill Lounge",
      x: 1800,
      y: 200,
      width: 1400,
      height: 650,
      color: "rgba(20, 184, 166, 0.14)"
    }
  ];

  // Partition Walls with Wide 300px Open Doorways for Every Room
  public static readonly WALLS: MapWall[] = [
    // Outer Bounding Border (5000 x 3500)
    { x: 0, y: 0, width: 5000, height: 60 },
    { x: 0, y: 3440, width: 5000, height: 60 },
    { x: 0, y: 0, width: 60, height: 3500 },
    { x: 4940, y: 0, width: 60, height: 3500 },

    // --- VIP Skylounge & Bar (300, 200, 1300, 900) ---
    { x: 300, y: 200, width: 1300, height: 30 },
    { x: 300, y: 200, width: 30, height: 900 },
    { x: 300, y: 1070, width: 450, height: 30 },
    { x: 1100, y: 1070, width: 500, height: 30 }, // OPEN DOORWAY at X: 750..1100
    { x: 1570, y: 200, width: 30, height: 900 },

    // --- Rooftop Observatory (3400, 200, 1300, 900) ---
    { x: 3400, y: 200, width: 1300, height: 30 },
    { x: 3400, y: 200, width: 30, height: 900 },
    { x: 4670, y: 200, width: 30, height: 900 },
    { x: 3400, y: 1070, width: 450, height: 30 },
    { x: 4200, y: 1070, width: 500, height: 30 }, // OPEN DOORWAY at X: 3850..4200

    // --- Zen Chill Lounge (1800, 200, 1400, 650) ---
    { x: 1800, y: 200, width: 1400, height: 30 },
    { x: 1800, y: 200, width: 30, height: 650 },
    { x: 3170, y: 200, width: 30, height: 650 },
    { x: 1800, y: 820, width: 500, height: 30 },
    { x: 2700, y: 820, width: 500, height: 30 }, // OPEN DOORWAY at X: 2300..2700

    // --- Neon Arcade & Gaming (200, 1300, 1300, 1000) ---
    { x: 200, y: 1300, width: 1300, height: 30 },
    { x: 200, y: 1300, width: 30, height: 1000 },
    { x: 200, y: 2270, width: 1300, height: 30 },
    { x: 1470, y: 1300, width: 30, height: 350 },
    { x: 1470, y: 1950, width: 30, height: 350 }, // OPEN DOORWAY at Y: 1650..1950

    // --- DJ Stage & Dance Floor (3500, 1300, 1300, 1000) ---
    { x: 3500, y: 1300, width: 1300, height: 30 },
    { x: 4770, y: 1300, width: 30, height: 1000 },
    { x: 3500, y: 2270, width: 1300, height: 30 },
    { x: 3500, y: 1300, width: 30, height: 350 },
    { x: 3500, y: 1950, width: 30, height: 350 }, // OPEN DOORWAY at Y: 1650..1950
    // Invisible Solid Stage Obstacle Boundary (upper side of DJ room)
    { x: 3750, y: 1330, width: 800, height: 460 },

    // --- Sunset Terrace Café (300, 2500, 1300, 800) ---
    { x: 300, y: 2500, width: 500, height: 30 },
    { x: 1100, y: 2500, width: 500, height: 30 }, // OPEN DOORWAY at X: 800..1100
    { x: 300, y: 2500, width: 30, height: 800 },
    { x: 1570, y: 2500, width: 30, height: 800 },
    { x: 300, y: 3270, width: 1300, height: 30 },

    // --- Courtyard Stage (1800, 2400, 1400, 900) ---
    { x: 1800, y: 2400, width: 500, height: 30 },
    { x: 2700, y: 2400, width: 500, height: 30 }, // OPEN DOORWAY at X: 2300..2700
    { x: 1800, y: 2400, width: 30, height: 900 },
    { x: 3170, y: 2400, width: 30, height: 900 },
    { x: 1800, y: 3270, width: 1400, height: 30 },

    // --- Acoustic Chat Pods (3400, 2500, 1300, 800) ---
    { x: 3400, y: 2500, width: 450, height: 30 },
    { x: 4200, y: 2500, width: 500, height: 30 }, // OPEN DOORWAY at X: 3850..4200
    { x: 3400, y: 2500, width: 30, height: 800 },
    { x: 4670, y: 2500, width: 30, height: 800 },
    { x: 3400, y: 3270, width: 1300, height: 30 },

    // Central Fountain Obstacle (Centered at x:2500, y:1500)
    { x: 2440, y: 1440, width: 120, height: 120 },
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
    return 'Central Cyber Plaza';
  }
}
