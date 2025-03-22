import RoomManager from "./rooms";
import AppSocket from "./socket";
import { SOCKET_EVENTS } from "@utils/enums";

export default class RoomCleaner {
  private static readonly INACTIVE_PLAYER_TIMEOUT = 45 * 1000;

  static cleanup(): void {
    const roomManager = new RoomManager();
    const rooms = roomManager.getAllRooms();
    let cleanupCount = 0;
    const now = new Date().getTime();

    for (const room of rooms) {
      // Filter out inactive players
      const initialPlayerCount = room.players.length;
      room.players = room.players.filter((player) => {
        const isInactive =
          !player.lastActiveAt ||
          now - player.lastActiveAt.getTime() > this.INACTIVE_PLAYER_TIMEOUT;

        if (isInactive) {
          // Broadcast player removal
          AppSocket.broadcastMessage(
            SOCKET_EVENTS.PLAYER_LEFT,
            { roomId: room.id, playerId: player.id },
            room.id
          );
          cleanupCount++;
        }
        return !isInactive;
      });

      // If players were removed, update the room
      if (initialPlayerCount !== room.players.length) {
        room.updatedAt = new Date();
      }

      // If room is empty, it will be automatically cleaned up by removePlayerFromRoom
      if (room.players.length === 0) {
        roomManager.removePlayerFromRoom(room.id, room.players[0]?.id);
      }
    }

    if (cleanupCount > 0) {
      console.log(
        `🧹 Cleanup completed: Removed ${cleanupCount} inactive players`
      );
    } else {
      console.log(`✨ No cleanup needed - all players are active`);
    }
  }
}
