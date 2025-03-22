import { Server as SocketServer, Socket } from "socket.io";

import { SOCKET_EVENTS } from "@utils/enums";
import RoomManager from "@app/rooms";
import { RoomPlayer } from "@utils/types";
import { Bug, Bullet } from "@utils/types";

export default class AppSocket {
  private static _instance: AppSocket | null = null;
  private static io: SocketServer | null = null;

  constructor(io: SocketServer) {
    if (AppSocket._instance) return AppSocket._instance;

    AppSocket.io = io;
    this.handleInit();
    AppSocket._instance = this;
    console.log(`⚡🟢 App socket initialized`);
  }

  private handleInit() {
    if (!AppSocket.io) return;

    AppSocket.io.on("connection", (socket) => {
      this.listenToSocketEvents(socket);
    });
  }

  private listenToSocketEvents(socket: Socket) {
    socket.on(
      SOCKET_EVENTS.JOIN_ROOM,
      async (data: { roomId: string; player: RoomPlayer }) => {
        try {
          const roomManager = new RoomManager();
          let room = roomManager.findRoom(data.roomId);

          if (!room) {
            // Create new room if it doesn't exist
            room = roomManager.createRoom(data.roomId, data.player);
          } else {
            // Join existing room
            room = roomManager.addPlayerToRoom(data.roomId, data.player);
          }

          // Join socket room
          socket.join(data.roomId);
          socket.emit(SOCKET_EVENTS.JOINED_ROOM, { room, player: data.player });

          // Broadcast to room that player joined
          AppSocket.broadcastMessage(
            SOCKET_EVENTS.PLAYER_JOINED,
            { room, player: data.player },
            data.roomId
          );
        } catch (err: any) {
          const errorMsg = err?.message || "Error joining room";
          this.sendSocketErrorMessage(socket, errorMsg);
          console.error(`⚡🔴 Error joining room`, err?.message, err);
        }
      }
    );

    socket.on(
      SOCKET_EVENTS.LEAVE_ROOM,
      async (data: { roomId: string; playerId: string }) => {
        try {
          const roomManager = new RoomManager();
          const updateRoom = roomManager.removePlayerFromRoom(
            data.roomId,
            data.playerId
          );

          // Leave socket room
          socket.leave(data.roomId);

          // Broadcast to room that player left
          AppSocket.broadcastMessage(
            SOCKET_EVENTS.PLAYER_LEFT,
            { room: updateRoom, roomId: data.roomId, playerId: data.playerId },
            data.roomId
          );
        } catch (err: any) {
          const errorMsg = err?.message || "Error leaving room";
          this.sendSocketErrorMessage(socket, errorMsg);
          console.error(`⚡🔴 Error leaving room`, err?.message, err);
        }
      }
    );

    // Heartbeat to keep room active
    socket.on(
      SOCKET_EVENTS.HEARTBEAT,
      (data: { roomId: string; playerId: string }) => {
        try {
          const roomManager = new RoomManager();
          const room = roomManager.findRoom(data.roomId);
          if (room) {
            room.updatedAt = new Date();
            // Update player's last active timestamp
            const player = room.players.find((p) => p.id === data.playerId);
            if (player) {
              player.lastActiveAt = new Date();
            }
          }
        } catch (err: any) {
          console.error(`⚡🔴 Error processing heartbeat`, err?.message, err);
        }
      }
    );

    // Add bug to room
    socket.on(
      SOCKET_EVENTS.ADD_BUG,
      async (data: { roomId: string; bug: Bug }) => {
        try {
          const roomManager = new RoomManager();
          const updatedRoom = roomManager.addBugToRoom(data.roomId, data.bug);

          // Broadcast to room that a new bug was added
          AppSocket.broadcastMessage(
            SOCKET_EVENTS.BUG_ADDED,
            { room: updatedRoom, bug: data.bug },
            data.roomId
          );
        } catch (err: any) {
          const errorMsg = err?.message || "Error adding bug";
          this.sendSocketErrorMessage(socket, errorMsg);
          console.error(`⚡🔴 Error adding bug`, err?.message, err);
        }
      }
    );

    // Remove bug from room
    socket.on(
      SOCKET_EVENTS.KILL_BUG,
      async (data: { roomId: string; bugId: string; playerId: string }) => {
        try {
          const roomManager = new RoomManager();
          const updatedRoom = roomManager.removeBugFromRoom(
            data.roomId,
            data.bugId
          );

          // Broadcast to room that a bug was killed
          AppSocket.broadcastMessage(
            SOCKET_EVENTS.BUG_KILLED,
            {
              room: updatedRoom,
              bugId: data.bugId,
              playerId: data.playerId,
            },
            data.roomId
          );
        } catch (err: any) {
          const errorMsg = err?.message || "Error removing bug";
          this.sendSocketErrorMessage(socket, errorMsg);
          console.error(`⚡🔴 Error removing bug`, err?.message, err);
        }
      }
    );

    // Update bug health
    socket.on(
      SOCKET_EVENTS.UPDATE_BUG_HEALTH,
      async (data: { roomId: string; bugId: string; health: number }) => {
        try {
          const roomManager = new RoomManager();
          const updatedRoom = roomManager.updateBugHealth(
            data.roomId,
            data.bugId,
            data.health
          );

          // Broadcast to room that bug health was updated
          AppSocket.broadcastMessage(
            SOCKET_EVENTS.BUG_HEALTH_UPDATED,
            {
              room: updatedRoom,
              bugId: data.bugId,
              health: data.health,
            },
            data.roomId
          );
        } catch (err: any) {
          const errorMsg = err?.message || "Error updating bug health";
          this.sendSocketErrorMessage(socket, errorMsg);
          console.error(`⚡🔴 Error updating bug health`, err?.message, err);
        }
      }
    );

    // Update player position
    socket.on(
      SOCKET_EVENTS.PLAYER_MOVE,
      async (data: {
        roomId: string;
        playerId: string;
        position: { x: number; y: number };
      }) => {
        try {
          const roomManager = new RoomManager();
          const updatedRoom = roomManager.updatePlayerPosition(
            data.roomId,
            data.playerId,
            data.position
          );

          // Broadcast player movement to other players in room
          AppSocket.broadcastMessage(
            SOCKET_EVENTS.PLAYER_MOVED,
            {
              room: updatedRoom,
              playerId: data.playerId,
              position: data.position,
            },
            data.roomId
          );
        } catch (err: any) {
          const errorMsg = err?.message || "Error updating player position";
          this.sendSocketErrorMessage(socket, errorMsg);
          console.error(
            `⚡🔴 Error updating player position`,
            err?.message,
            err
          );
        }
      }
    );

    // Fire bullet event
    socket.on(
      SOCKET_EVENTS.FIRE_BULLET,
      async (data: { roomId: string; playerId: string; bullet: Bullet }) => {
        try {
          const roomManager = new RoomManager();
          const updatedRoom = roomManager.addBulletToPlayer(
            data.roomId,
            data.playerId,
            data.bullet
          );

          // Broadcast to room that a bullet was fired
          AppSocket.broadcastMessage(
            SOCKET_EVENTS.BULLET_FIRED,
            {
              room: updatedRoom,
              playerId: data.playerId,
              bullet: data.bullet,
            },
            data.roomId
          );
        } catch (err: any) {
          const errorMsg = err?.message || "Error firing bullet";
          this.sendSocketErrorMessage(socket, errorMsg);
          console.error(`⚡🔴 Error firing bullet`, err?.message, err);
        }
      }
    );

    // Update bullet positions event
    socket.on(
      SOCKET_EVENTS.UPDATE_BULLETS,
      async (data: { roomId: string; playerId: string; bullets: Bullet[] }) => {
        try {
          const roomManager = new RoomManager();
          const updatedRoom = roomManager.updatePlayerBullets(
            data.roomId,
            data.playerId,
            data.bullets
          );

          // Broadcast updated bullet positions to room
          AppSocket.broadcastMessage(
            SOCKET_EVENTS.BULLETS_UPDATED,
            {
              room: updatedRoom,
              playerId: data.playerId,
              bullets: data.bullets,
            },
            data.roomId
          );
        } catch (err: any) {
          const errorMsg = err?.message || "Error updating bullets";
          this.sendSocketErrorMessage(socket, errorMsg);
          console.error(`⚡🔴 Error updating bullets`, err?.message, err);
        }
      }
    );

    // Game over event
    socket.on(SOCKET_EVENTS.GAME_OVER, async (data: { roomId: string }) => {
      try {
        const roomManager = new RoomManager();
        const updatedRoom = roomManager.setRoomStatus(data.roomId, "over");

        // Broadcast to room that game is over
        AppSocket.broadcastMessage(
          SOCKET_EVENTS.GAME_OVER,
          { room: updatedRoom },
          data.roomId
        );
      } catch (err: any) {
        const errorMsg = err?.message || "Error ending game";
        this.sendSocketErrorMessage(socket, errorMsg);
        console.error(`⚡🔴 Error ending game`, err?.message, err);
      }
    });

    // Restart game event
    socket.on(SOCKET_EVENTS.RESTART_GAME, async (data: { roomId: string }) => {
      try {
        const roomManager = new RoomManager();
        const updatedRoom = roomManager.restartRoom(data.roomId);

        // Broadcast to room that game is restarting
        AppSocket.broadcastMessage(
          SOCKET_EVENTS.GAME_RESTARTED,
          { room: updatedRoom },
          data.roomId
        );
      } catch (err: any) {
        const errorMsg = err?.message || "Error restarting game";
        this.sendSocketErrorMessage(socket, errorMsg);
        console.error(`⚡🔴 Error restarting game`, err?.message, err);
      }
    });
  }

  private sendSocketErrorMessage(socket: Socket, message: string) {
    socket.emit(SOCKET_EVENTS.ERROR, message);
  }

  static broadcastMessage(event: SOCKET_EVENTS, payload: any, room: string) {
    if (!AppSocket.io) return console.error(`⚡🔴🔴 io not found`);

    AppSocket.io.to(room).emit(event, payload);
  }
}
