/**
 * Evaluation Metrics: Silhouette Score and Adjusted Rand Index (ARI).
 */
import { DataValue } from '../types';

export function computeSilhouetteScore(
  data: number[][],
  labels: number[]
): number | null {
  const n = data.length;
  if (n <= 1) return null;

  const d = data[0].length;

  // Group indices by cluster (ignore noise -1)
  const clusterMap = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const c = labels[i];
    if (c >= 0) {
      if (!clusterMap.has(c)) clusterMap.set(c, []);
      clusterMap.get(c)!.push(i);
    }
  }

  // Must have at least 2 distinct clusters
  if (clusterMap.size < 2) return null;

  let totalSilhouette = 0;
  let validPoints = 0;

  for (let i = 0; i < n; i++) {
    const c = labels[i];
    if (c < 0) continue; // Skip noise

    const sameCluster = clusterMap.get(c)!;
    if (sameCluster.length <= 1) continue;

    // Calculate a(i): mean intra-cluster distance
    let aSum = 0;
    for (const j of sameCluster) {
      if (i === j) continue;
      let dist = 0;
      for (let k = 0; k < d; k++) {
        const diff = data[i][k] - data[j][k];
        dist += diff * diff;
      }
      aSum += Math.sqrt(dist);
    }
    const a = aSum / (sameCluster.length - 1);

    // Calculate b(i): minimum mean distance to another cluster
    let b = Infinity;
    clusterMap.forEach((otherIndices, otherC) => {
      if (otherC === c || otherIndices.length === 0) return;
      let bSum = 0;
      for (const j of otherIndices) {
        let dist = 0;
        for (let k = 0; k < d; k++) {
          const diff = data[i][k] - data[j][k];
          dist += diff * diff;
        }
        bSum += Math.sqrt(dist);
      }
      const meanB = bSum / otherIndices.length;
      if (meanB < b) b = meanB;
    });

    if (b === Infinity) continue;

    const s = (b - a) / Math.max(a, b);
    totalSilhouette += s;
    validPoints++;
  }

  return validPoints > 0 ? totalSilhouette / validPoints : null;
}

export function computeARI(
  groundTruth: DataValue[],
  predicted: number[]
): number | null {
  const n = groundTruth.length;
  if (n <= 1 || predicted.length !== n) return null;

  // Contingency table: n_ij
  const rowLabels = Array.from(new Set(groundTruth));
  const colLabels = Array.from(new Set(predicted));

  if (rowLabels.length <= 1 || colLabels.length <= 1) return 0;

  const rowMap = new Map<DataValue, number>();
  rowLabels.forEach((lbl, idx) => rowMap.set(lbl, idx));

  const colMap = new Map<number, number>();
  colLabels.forEach((lbl, idx) => colMap.set(lbl, idx));

  const table: number[][] = Array.from({ length: rowLabels.length }, () =>
    new Array(colLabels.length).fill(0)
  );

  for (let i = 0; i < n; i++) {
    const r = rowMap.get(groundTruth[i])!;
    const c = colMap.get(predicted[i])!;
    table[r][c]++;
  }

  // Helper: n choose 2
  const comb2 = (val: number) => (val * (val - 1)) / 2;

  let sumNij = 0;
  for (let r = 0; r < rowLabels.length; r++) {
    for (let c = 0; c < colLabels.length; c++) {
      sumNij += comb2(table[r][c]);
    }
  }

  // Row sums: a_i
  let sumAi = 0;
  for (let r = 0; r < rowLabels.length; r++) {
    let a_i = 0;
    for (let c = 0; c < colLabels.length; c++) a_i += table[r][c];
    sumAi += comb2(a_i);
  }

  // Col sums: b_j
  let sumBj = 0;
  for (let c = 0; c < colLabels.length; c++) {
    let b_j = 0;
    for (let r = 0; r < rowLabels.length; r++) b_j += table[r][c];
    sumBj += comb2(b_j);
  }

  const totalComb = comb2(n);
  const expectedIndex = (sumAi * sumBj) / totalComb;
  const maxIndex = (sumAi + sumBj) / 2;
  const denominator = maxIndex - expectedIndex;

  if (denominator === 0) return 1.0;

  const ari = (sumNij - expectedIndex) / denominator;
  return Math.max(-1, Math.min(1, ari));
}
