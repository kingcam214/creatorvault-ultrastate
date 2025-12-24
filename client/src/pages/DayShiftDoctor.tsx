/**
 * 💃 DAYSHIFT DOCTOR - STRIP CLUB VERTICAL
 * 
 * Strip club partnerships and dancer monetization
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { DollarSign, MapPin, TrendingUp, Calendar } from "lucide-react";

export default function DayShiftDoctor() {
  const [avgRevenuePerShift, setAvgRevenuePerShift] = useState(500);
  const [shiftsPerWeek, setShiftsPerWeek] = useState(4);
  const [clubCommissionRate] = useState(10); // Fixed at 10%

  // Get Dallas clubs
  const { data: clubs } = trpc.dayShiftDoctor.getDallasClubs.useQuery();

  // Calculate dancer revenue projection
  const { data: projection } = trpc.dayShiftDoctor.projectDancerRevenue.useQuery({
    avgRevenuePerShift,
    shiftsPerWeek,
    clubCommissionRate
  });

  // Calculate shift split
  const { data: shiftSplit } = trpc.dayShiftDoctor.calculateShiftSplit.useQuery({
    totalRevenue: avgRevenuePerShift,
    clubCommissionRate
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 via-black to-purple-900">
      <div className="container max-w-7xl py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-6xl">💃</span>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              DayShift Doctor
            </h1>
          </div>
          <p className="text-2xl text-white font-semibold mb-2">Monetize Every Shift</p>
          <p className="text-lg text-gray-300">
            Dallas strip club partnerships • Dancer revenue optimization
          </p>
        </div>

        {/* Calculator Section */}
        <Card className="bg-black/40 border-pink-500/30 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Calculator
            </CardTitle>
            <CardDescription>See how much you can earn with DayShift Doctor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="avgRevenue" className="text-white">Avg Revenue Per Shift ($)</Label>
                <Input
                  id="avgRevenue"
                  type="number"
                  value={avgRevenuePerShift}
                  onChange={(e) => setAvgRevenuePerShift(Number(e.target.value))}
                  className="bg-black/40 border-pink-500/30 text-white"
                />
              </div>
              <div>
                <Label htmlFor="shifts" className="text-white">Shifts Per Week</Label>
                <Input
                  id="shifts"
                  type="number"
                  value={shiftsPerWeek}
                  onChange={(e) => setShiftsPerWeek(Number(e.target.value))}
                  className="bg-black/40 border-pink-500/30 text-white"
                />
              </div>
            </div>

            {/* Shift Split Breakdown */}
            {shiftSplit && (
              <div className="mt-6 p-4 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg border border-pink-500/30">
                <p className="text-white font-semibold mb-3">Per-Shift Breakdown:</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-gray-400 text-sm">You Keep</p>
                    <p className="text-2xl font-bold text-green-400">
                      ${shiftSplit.dancer.toFixed(2)}
                    </p>
                    <p className="text-gray-400 text-xs">85%</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Club</p>
                    <p className="text-xl text-white">
                      ${shiftSplit.club.toFixed(2)}
                    </p>
                    <p className="text-gray-400 text-xs">10%</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Platform</p>
                    <p className="text-xl text-white">
                      ${shiftSplit.platform.toFixed(2)}
                    </p>
                    <p className="text-gray-400 text-xs">5%</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Projection */}
        {projection && (
          <Card className="bg-black/40 border-purple-500/30 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                Your Earnings Projection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-black/40 rounded-lg">
                  <p className="text-gray-400 mb-2">Weekly</p>
                  <p className="text-3xl font-bold text-white">
                    ${projection.weeklyDancerAmount.toFixed(2)}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {shiftsPerWeek} shifts
                  </p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-lg border-2 border-pink-500">
                  <p className="text-gray-400 mb-2">Monthly</p>
                  <p className="text-4xl font-bold text-pink-400">
                    ${projection.monthlyDancerAmount.toFixed(2)}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    ~{(shiftsPerWeek * 4.33).toFixed(0)} shifts
                  </p>
                </div>
                <div className="text-center p-6 bg-black/40 rounded-lg">
                  <p className="text-gray-400 mb-2">Yearly</p>
                  <p className="text-3xl font-bold text-white">
                    ${projection.yearlyDancerAmount.toFixed(2)}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {shiftsPerWeek * 52} shifts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dallas Clubs */}
        <Card className="bg-black/40 border-pink-500/30 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-pink-400" />
              Dallas Partner Clubs
            </CardTitle>
            <CardDescription>Clubs integrated with DayShift Doctor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clubs?.map((club, index) => (
                <div
                  key={index}
                  className="p-4 bg-black/40 border border-pink-500/30 rounded-lg hover:border-pink-500 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-white font-semibold text-lg">{club.name}</h3>
                      <p className="text-gray-400 text-sm">{club.address}</p>
                      {club.phone && (
                        <p className="text-gray-400 text-sm">{club.phone}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      club.type === "upscale" 
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-pink-500/20 text-pink-400"
                    }`}>
                      {club.type.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700">
                    <div>
                      <p className="text-gray-400 text-xs">Avg Dancers</p>
                      <p className="text-white font-semibold">{club.avgDancerCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Nightly Revenue</p>
                      <p className="text-white font-semibold">
                        ${club.avgNightlyRevenue.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Status</p>
                      <p className={`font-semibold ${
                        club.partnershipStatus === "active" 
                          ? "text-green-400" 
                          : "text-yellow-400"
                      }`}>
                        {club.partnershipStatus}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
          >
            <Calendar className="mr-2 h-5 w-5" />
            Join DayShift Doctor
          </Button>
          <p className="text-gray-400 mt-4">
            85% to you • 10% to club • 5% to platform
          </p>
        </div>
      </div>
    </div>
  );
}
