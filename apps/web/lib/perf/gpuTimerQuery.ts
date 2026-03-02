"use client";

type TimerQueryExt = {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
};

interface PendingQuery {
  query: WebGLQuery;
}

/**
 * Lightweight WebGL2 timer-query helper with graceful fallback.
 * Uses EXT_disjoint_timer_query_webgl2 when available.
 */
export class GpuTimerQuery {
  private ext: TimerQueryExt | null = null;
  private available = false;
  private activeQuery: WebGLQuery | null = null;
  private pending: PendingQuery[] = [];
  private smoothedMs = 0;
  private cpuStart = 0;

  init(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    const gl2 = gl as WebGL2RenderingContext;
    if (typeof gl2.createQuery !== "function") {
      this.available = false;
      this.ext = null;
      return;
    }
    const ext = gl2.getExtension("EXT_disjoint_timer_query_webgl2") as TimerQueryExt | null;
    this.ext = ext;
    this.available = !!ext;
  }

  begin(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    if (!this.available || !this.ext || this.activeQuery) return false;
    const gl2 = gl as WebGL2RenderingContext;
    const query = gl2.createQuery();
    if (!query) return false;
    this.activeQuery = query;
    gl2.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
    return true;
  }

  end(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    if (!this.available || !this.ext || !this.activeQuery) return;
    const gl2 = gl as WebGL2RenderingContext;
    gl2.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push({ query: this.activeQuery });
    this.activeQuery = null;
  }

  beginCpu() {
    this.cpuStart = performance.now();
  }

  endCpu() {
    const cpuMs = performance.now() - this.cpuStart;
    this.smoothedMs = this.smoothedMs > 0 ? this.smoothedMs * 0.85 + cpuMs * 0.15 : cpuMs;
  }

  poll(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    if (!this.available || !this.ext || this.pending.length === 0) return this.smoothedMs;
    const gl2 = gl as WebGL2RenderingContext;

    const disjoint = !!gl2.getParameter(this.ext.GPU_DISJOINT_EXT);
    if (disjoint) {
      for (const item of this.pending) {
        gl2.deleteQuery(item.query);
      }
      this.pending = [];
      return this.smoothedMs;
    }

    while (this.pending.length > 0) {
      const head = this.pending[0];
      const available = !!gl2.getQueryParameter(head.query, gl2.QUERY_RESULT_AVAILABLE);
      if (!available) break;
      const ns = gl2.getQueryParameter(head.query, gl2.QUERY_RESULT) as number;
      const ms = ns / 1_000_000;
      this.smoothedMs = this.smoothedMs > 0 ? this.smoothedMs * 0.85 + ms * 0.15 : ms;
      gl2.deleteQuery(head.query);
      this.pending.shift();
    }
    return this.smoothedMs;
  }

  getValueMs() {
    return this.smoothedMs;
  }

  dispose(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    if (!this.available) return;
    const gl2 = gl as WebGL2RenderingContext;
    if (this.activeQuery) {
      gl2.deleteQuery(this.activeQuery);
      this.activeQuery = null;
    }
    for (const item of this.pending) {
      gl2.deleteQuery(item.query);
    }
    this.pending = [];
  }
}
