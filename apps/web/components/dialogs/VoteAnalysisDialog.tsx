"use client";

import { useState, type ReactNode } from "react";
import { BarChart3, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAction, useQuery } from "convex/react";
import { api } from "@blackhole/backend/convex/_generated/api";

interface VoteAnalysisDialogProps {
  children: ReactNode;
}

export function VoteAnalysisDialog({ children }: VoteAnalysisDialogProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);

  const analysis = useQuery(api.model.presetVotes.analysis.getAnalysis);
  const triggerAnalysis = useAction(api.model.presetVotes.analysis.triggerAnalysis);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await triggerAnalysis();
    setAnalyzing(false);
  };

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Vote Analysis</DialogTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAnalyze}
              disabled={analyzing}
              className="gap-1.5"
            >
              {analyzing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <BarChart3 className="h-3 w-3" />
              )}
              Run Analysis
            </Button>
          </div>
        </DialogHeader>
        <Separator />

        <div className="flex-1 overflow-y-auto -mx-6 px-6 min-h-0 space-y-4 py-2">
          {!analysis ? (
            <div className="py-8 text-center text-muted-foreground">
              No analysis data yet. Click &quot;Run Analysis&quot; to generate.
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Total Votes" value={analysis.totalVotes} />
                <Stat label="Upvotes" value={analysis.upvotes} />
                <Stat label="Downvotes" value={analysis.downvotes} />
                <Stat label="Presets Analyzed" value={analysis.presetsAnalyzed} />
              </div>
              <p className="text-xs text-muted-foreground">
                Last updated: {formatDate(analysis._creationTime)}
              </p>

              <Separator />

              {/* Clusters */}
              {analysis.clusters.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Clusters</h4>
                  {analysis.clusters.map((cluster, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{cluster.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {cluster.size} presets · avg {cluster.avgScore.toFixed(2)}
                        </span>
                      </div>
                      {cluster.topPalettes.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Palettes: {cluster.topPalettes.join(", ")}
                        </p>
                      )}
                      {cluster.topCameraModes.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Camera: {cluster.topCameraModes.join(", ")}
                        </p>
                      )}
                      {cluster.centroid.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {cluster.centroid.map((c) => (
                            <span
                              key={c.param}
                              className="text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5"
                            >
                              {c.param}: {c.value.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Anti-patterns */}
              {analysis.antiPatterns.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Anti-patterns</h4>
                  {analysis.antiPatterns.map((ap, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-1.5">
                      <p className="text-sm">{ap.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          avg score: {ap.avgScore.toFixed(2)}
                        </span>
                      </div>
                      {ap.params.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {ap.params.map((p) => (
                            <span
                              key={p.param}
                              className="text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5"
                            >
                              {p.param}: {p.range}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Collapsible prompt fragment */}
              {analysis.promptFragment && (
                <div className="space-y-1">
                  <button
                    onClick={() => setPromptExpanded(!promptExpanded)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {promptExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    LLM Prompt Fragment
                  </button>
                  {promptExpanded && (
                    <pre className="text-[10px] text-muted-foreground bg-black/20 border border-white/5 rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap">
                      {analysis.promptFragment}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-lg p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}
