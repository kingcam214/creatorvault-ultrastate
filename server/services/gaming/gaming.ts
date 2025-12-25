/**
 * CREATORVAULT GAMING (CVG) - LOSO DIVISION
 * Tournament management, player registration, Loso Playbook AI, Anmar Legacy
 * 100% of Loso-related revenue flows to Godmother (hardcoded)
 */

import { invokeLLM } from "../../_core/llm";

export type GameType = "madden" | "nba2k" | "other";
export type TournamentFormat = "single-elimination" | "double-elimination" | "round-robin" | "swiss";
export type TournamentLocation = "dr" | "usa" | "online";
export type TournamentStatus = "draft" | "open" | "in-progress" | "completed" | "cancelled";
export type PlayerStatus = "registered" | "checked-in" | "active" | "eliminated" | "disqualified" | "withdrew";
export type MatchStatus = "scheduled" | "in-progress" | "completed" | "disputed" | "cancelled";
export type LegacyPerson = "carlos-anmar-maxie" | "carlos-anmar-thompson-loso" | "both";

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  game: GameType;
  gameVersion?: string;
  format: TournamentFormat;
  teamSize: number;
  location: TournamentLocation;
  startDate: number;
  endDate?: number;
  registrationDeadline: number;
  prizePool: number; // in cents
  currency: string;
  entryFee: number; // in cents
  isLosoDivision: boolean; // 100% revenue to Godmother
  godmotherUserId?: number;
  status: TournamentStatus;
  rules?: string;
  streamUrl?: string;
  bracketJson?: any;
  organizerId: number;
  createdAt: number;
}

export interface Player {
  id: string;
  tournamentId: string;
  userId: number;
  gamerTag: string;
  teamName?: string;
  registeredAt: number;
  paymentStatus: "pending" | "paid" | "refunded";
  paymentAmount: number;
  seed?: number;
  currentRound: number;
  wins: number;
  losses: number;
  placement?: number;
  prizeWon: number;
  status: PlayerStatus;
  notes?: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  player1Id?: string;
  player2Id?: string;
  player1Score: number;
  player2Score: number;
  winnerId?: string;
  scheduledAt?: number;
  startedAt?: number;
  completedAt?: number;
  status: MatchStatus;
  streamUrl?: string;
  replayUrl?: string;
  notes?: string;
}

export interface LosoRevenue {
  id: string;
  tournamentId?: string;
  sourceType: "tournament-entry" | "tournament-prize" | "merchandise" | "sponsorship" | "other";
  description?: string;
  amount: number; // in cents
  currency: string;
  godmotherUserId: number;
  allocationPercentage: number; // ALWAYS 100
  godmotherAmount: number; // ALWAYS equals amount
  paymentStatus: "pending" | "paid" | "failed";
  paidAt?: number;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  createdAt: number;
}

export interface AnmarLegacyContent {
  id: string;
  title: string;
  description?: string;
  contentType: "story" | "photo" | "video" | "documentary" | "article" | "tribute";
  legacyPerson: LegacyPerson;
  contentUrl?: string;
  thumbnailUrl?: string;
  bodyText?: string;
  year?: number;
  location?: string;
  tags?: string[];
  isPublic: boolean;
  isFeatured: boolean;
  authorId?: number;
  views: number;
  likes: number;
  createdAt: number;
}

export interface LosoPlaybook {
  id: string;
  userId: number;
  game: GameType;
  gameVersion: string;
  name: string;
  description?: string;
  offensiveScheme?: string;
  defensiveScheme?: string;
  keyPlays?: string[];
  counters?: any;
  aiGeneratedStrategy?: string;
  strengthsWeaknesses?: any;
  isPublic: boolean;
  downloads: number;
  rating: number; // 0-500 (0-5 stars * 100)
  createdAt: number;
}

export class CreatorVaultGaming {
  /**
   * GODMOTHER USER ID - HARDCODED
   * All Loso Division revenue goes 100% to this user
   */
  private readonly GODMOTHER_USER_ID = 1; // TODO: Update with actual Godmother user ID

  /**
   * Create tournament
   */
  createTournament(input: {
    name: string;
    description?: string;
    game: GameType;
    gameVersion?: string;
    format?: TournamentFormat;
    teamSize?: number;
    location: TournamentLocation;
    startDate: number;
    endDate?: number;
    registrationDeadline: number;
    prizePool?: number;
    currency?: string;
    entryFee?: number;
    isLosoDivision: boolean;
    rules?: string;
    streamUrl?: string;
    organizerId: number;
  }): Tournament {
    const tournamentId = `tournament-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: tournamentId,
      name: input.name,
      description: input.description,
      game: input.game,
      gameVersion: input.gameVersion,
      format: input.format || "single-elimination",
      teamSize: input.teamSize || 1,
      location: input.location,
      startDate: input.startDate,
      endDate: input.endDate,
      registrationDeadline: input.registrationDeadline,
      prizePool: input.prizePool || 0,
      currency: input.currency || "USD",
      entryFee: input.entryFee || 0,
      isLosoDivision: input.isLosoDivision,
      godmotherUserId: input.isLosoDivision ? this.GODMOTHER_USER_ID : undefined,
      status: "draft",
      rules: input.rules,
      streamUrl: input.streamUrl,
      organizerId: input.organizerId,
      createdAt: Date.now(),
    };
  }

  /**
   * Register player for tournament
   */
  registerPlayer(input: {
    tournamentId: string;
    userId: number;
    gamerTag: string;
    teamName?: string;
    paymentAmount: number;
  }): Player {
    const playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: playerId,
      tournamentId: input.tournamentId,
      userId: input.userId,
      gamerTag: input.gamerTag,
      teamName: input.teamName,
      registeredAt: Date.now(),
      paymentStatus: input.paymentAmount > 0 ? "pending" : "paid",
      paymentAmount: input.paymentAmount,
      currentRound: 0,
      wins: 0,
      losses: 0,
      prizeWon: 0,
      status: "registered",
    };
  }

  /**
   * Create match
   */
  createMatch(input: {
    tournamentId: string;
    round: number;
    matchNumber: number;
    player1Id?: string;
    player2Id?: string;
    scheduledAt?: number;
  }): Match {
    const matchId = `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: matchId,
      tournamentId: input.tournamentId,
      round: input.round,
      matchNumber: input.matchNumber,
      player1Id: input.player1Id,
      player2Id: input.player2Id,
      player1Score: 0,
      player2Score: 0,
      scheduledAt: input.scheduledAt,
      status: "scheduled",
    };
  }

  /**
   * Record match result
   */
  recordMatchResult(
    match: Match,
    input: {
      player1Score: number;
      player2Score: number;
      winnerId: string;
    }
  ): Match {
    match.player1Score = input.player1Score;
    match.player2Score = input.player2Score;
    match.winnerId = input.winnerId;
    match.status = "completed";
    match.completedAt = Date.now();

    return match;
  }

  /**
   * Track Loso Division revenue - 100% to Godmother
   */
  trackLosoRevenue(input: {
    tournamentId?: string;
    sourceType: "tournament-entry" | "tournament-prize" | "merchandise" | "sponsorship" | "other";
    description?: string;
    amount: number;
    currency?: string;
    notes?: string;
  }): LosoRevenue {
    const revenueId = `loso-rev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // HARDCODED: 100% to Godmother
    const allocationPercentage = 100;
    const godmotherAmount = input.amount;

    return {
      id: revenueId,
      tournamentId: input.tournamentId,
      sourceType: input.sourceType,
      description: input.description,
      amount: input.amount,
      currency: input.currency || "USD",
      godmotherUserId: this.GODMOTHER_USER_ID,
      allocationPercentage,
      godmotherAmount,
      paymentStatus: "pending",
      notes: input.notes,
      createdAt: Date.now(),
    };
  }

  /**
   * Calculate total Loso revenue for Godmother
   */
  calculateGodmotherRevenue(revenues: LosoRevenue[]): {
    totalPending: number;
    totalPaid: number;
    totalFailed: number;
    totalAll: number;
    bySource: Record<string, number>;
  } {
    let totalPending = 0;
    let totalPaid = 0;
    let totalFailed = 0;
    const bySource: Record<string, number> = {};

    for (const rev of revenues) {
      // Verify 100% allocation
      if (rev.allocationPercentage !== 100 || rev.godmotherAmount !== rev.amount) {
        console.error(`⚠️ LOSO REVENUE VIOLATION: Revenue ${rev.id} does not have 100% allocation!`);
      }

      if (rev.paymentStatus === "pending") {
        totalPending += rev.godmotherAmount;
      } else if (rev.paymentStatus === "paid") {
        totalPaid += rev.godmotherAmount;
      } else if (rev.paymentStatus === "failed") {
        totalFailed += rev.godmotherAmount;
      }

      bySource[rev.sourceType] = (bySource[rev.sourceType] || 0) + rev.godmotherAmount;
    }

    return {
      totalPending,
      totalPaid,
      totalFailed,
      totalAll: totalPending + totalPaid + totalFailed,
      bySource,
    };
  }

  /**
   * Create Anmar Legacy content
   */
  createAnmarLegacyContent(input: {
    title: string;
    description?: string;
    contentType: "story" | "photo" | "video" | "documentary" | "article" | "tribute";
    legacyPerson: LegacyPerson;
    contentUrl?: string;
    thumbnailUrl?: string;
    bodyText?: string;
    year?: number;
    location?: string;
    tags?: string[];
    isPublic?: boolean;
    isFeatured?: boolean;
    authorId?: number;
  }): AnmarLegacyContent {
    const contentId = `anmar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: contentId,
      title: input.title,
      description: input.description,
      contentType: input.contentType,
      legacyPerson: input.legacyPerson,
      contentUrl: input.contentUrl,
      thumbnailUrl: input.thumbnailUrl,
      bodyText: input.bodyText,
      year: input.year,
      location: input.location,
      tags: input.tags,
      isPublic: input.isPublic !== false,
      isFeatured: input.isFeatured || false,
      authorId: input.authorId,
      views: 0,
      likes: 0,
      createdAt: Date.now(),
    };
  }

  /**
   * Generate Loso Playbook using AI
   */
  async generateLosoPlaybook(input: {
    userId: number;
    game: GameType;
    gameVersion: string;
    name: string;
    description?: string;
    offensiveScheme?: string;
    defensiveScheme?: string;
    opponentStyle?: string;
  }): Promise<LosoPlaybook> {
    const playbookId = `playbook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Generate AI strategy
    const prompt = `You are Loso, a master ${input.game} strategist. Generate a detailed game plan for ${input.gameVersion}.

Game: ${input.game}
Offensive Scheme: ${input.offensiveScheme || "Balanced"}
Defensive Scheme: ${input.defensiveScheme || "Balanced"}
Opponent Style: ${input.opponentStyle || "Unknown"}

Provide:
1. Key plays to run (5-7 specific plays)
2. Defensive counters for common opponent strategies
3. Strengths and weaknesses of this playbook
4. Situational adjustments (red zone, 2-minute drill, etc.)

Format as JSON with keys: keyPlays (array), counters (object), strengths (array), weaknesses (array), strategy (string)`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are Loso, a master gaming strategist for Madden and NBA 2K." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "loso_playbook",
            strict: true,
            schema: {
              type: "object",
              properties: {
                keyPlays: {
                  type: "array",
                  items: { type: "string" },
                  description: "5-7 key plays to run",
                },
                counters: {
                  type: "object",
                  additionalProperties: { type: "string" },
                  description: "Defensive counters for opponent strategies",
                },
                strengths: {
                  type: "array",
                  items: { type: "string" },
                  description: "Strengths of this playbook",
                },
                weaknesses: {
                  type: "array",
                  items: { type: "string" },
                  description: "Weaknesses to watch out for",
                },
                strategy: {
                  type: "string",
                  description: "Overall strategy summary",
                },
              },
              required: ["keyPlays", "counters", "strengths", "weaknesses", "strategy"],
              additionalProperties: false,
            },
          },
        },
      });

      const aiData = JSON.parse(response.choices[0].message.content || "{}");

      return {
        id: playbookId,
        userId: input.userId,
        game: input.game,
        gameVersion: input.gameVersion,
        name: input.name,
        description: input.description,
        offensiveScheme: input.offensiveScheme,
        defensiveScheme: input.defensiveScheme,
        keyPlays: aiData.keyPlays || [],
        counters: aiData.counters || {},
        aiGeneratedStrategy: aiData.strategy || "",
        strengthsWeaknesses: {
          strengths: aiData.strengths || [],
          weaknesses: aiData.weaknesses || [],
        },
        isPublic: false,
        downloads: 0,
        rating: 0,
        createdAt: Date.now(),
      };
    } catch (error) {
      console.error("Failed to generate AI playbook:", error);

      // Return basic playbook without AI
      return {
        id: playbookId,
        userId: input.userId,
        game: input.game,
        gameVersion: input.gameVersion,
        name: input.name,
        description: input.description,
        offensiveScheme: input.offensiveScheme,
        defensiveScheme: input.defensiveScheme,
        keyPlays: [],
        counters: {},
        isPublic: false,
        downloads: 0,
        rating: 0,
        createdAt: Date.now(),
      };
    }
  }

  /**
   * Generate tournament bracket
   */
  generateBracket(players: Player[], format: TournamentFormat): any {
    const activePlayers = players.filter((p) => p.status === "registered" || p.status === "checked-in");

    if (format === "single-elimination") {
      return this.generateSingleEliminationBracket(activePlayers);
    }

    // TODO: Implement other formats
    return { format, players: activePlayers.length, rounds: [] };
  }

  private generateSingleEliminationBracket(players: Player[]): any {
    const playerCount = players.length;
    const rounds = Math.ceil(Math.log2(playerCount));
    const bracket: any[] = [];

    // Round 1
    const round1Matches: any[] = [];
    for (let i = 0; i < playerCount; i += 2) {
      if (i + 1 < playerCount) {
        round1Matches.push({
          matchNumber: round1Matches.length + 1,
          player1: players[i],
          player2: players[i + 1],
        });
      } else {
        // Bye
        round1Matches.push({
          matchNumber: round1Matches.length + 1,
          player1: players[i],
          player2: null,
        });
      }
    }

    bracket.push({
      round: 1,
      matches: round1Matches,
    });

    // Subsequent rounds (placeholders)
    for (let r = 2; r <= rounds; r++) {
      const matchCount = Math.ceil(playerCount / Math.pow(2, r));
      bracket.push({
        round: r,
        matches: Array(matchCount)
          .fill(null)
          .map((_, i) => ({
            matchNumber: i + 1,
            player1: null,
            player2: null,
          })),
      });
    }

    return {
      format: "single-elimination",
      totalRounds: rounds,
      totalPlayers: playerCount,
      bracket,
    };
  }

  /**
   * Get tournament stats
   */
  getTournamentStats(tournament: Tournament, players: Player[]): {
    totalPlayers: number;
    checkedIn: number;
    active: number;
    eliminated: number;
    totalRevenue: number;
    totalPrizePool: number;
    averageSkillLevel: number;
  } {
    const totalPlayers = players.length;
    const checkedIn = players.filter((p) => p.status === "checked-in").length;
    const active = players.filter((p) => p.status === "active").length;
    const eliminated = players.filter((p) => p.status === "eliminated").length;
    const totalRevenue = players.reduce((sum, p) => sum + (p.paymentStatus === "paid" ? p.paymentAmount : 0), 0);

    return {
      totalPlayers,
      checkedIn,
      active,
      eliminated,
      totalRevenue,
      totalPrizePool: tournament.prizePool,
      averageSkillLevel: 0, // TODO: Implement skill rating system
    };
  }
}
