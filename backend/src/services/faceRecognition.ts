import { CompareFacesCommand, DetectFacesCommand, RekognitionClient } from '@aws-sdk/client-rekognition';

const region = process.env.AWS_REGION ?? 'eu-west-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const client =
  accessKeyId && secretAccessKey
    ? new RekognitionClient({ region, credentials: { accessKeyId, secretAccessKey } })
    : null;

const MIN_FACE_CONFIDENCE = 85;
const MATCH_SIMILARITY_THRESHOLD = 80;

export async function imageContainsFace(imageBytes: Buffer): Promise<boolean> {
  if (!client) {
    console.log('[dev] Pas de clé AWS configurée. Détection de visage ignorée (photo autorisée par défaut).');
    return true;
  }

  try {
    const result = await client.send(new DetectFacesCommand({ Image: { Bytes: imageBytes } }));
    return (result.FaceDetails ?? []).some((face) => (face.Confidence ?? 0) >= MIN_FACE_CONFIDENCE);
  } catch (error) {
    console.error('[Rekognition] Échec de la détection de visage :', error);
    // Un incident côté fournisseur ne doit pas empêcher tout upload : on laisse passer.
    return true;
  }
}

export async function compareFaces(
  sourceBytes: Buffer,
  targetBytes: Buffer
): Promise<{ matched: boolean; similarity: number }> {
  if (!client) {
    console.log('[dev] Pas de clé AWS configurée. Comparaison de visage ignorée (profil non vérifié par défaut).');
    return { matched: false, similarity: 0 };
  }

  try {
    const result = await client.send(
      new CompareFacesCommand({
        SourceImage: { Bytes: sourceBytes },
        TargetImage: { Bytes: targetBytes },
        SimilarityThreshold: MATCH_SIMILARITY_THRESHOLD,
      })
    );
    const best = (result.FaceMatches ?? []).sort((a, b) => (b.Similarity ?? 0) - (a.Similarity ?? 0))[0];
    return { matched: !!best, similarity: best?.Similarity ?? 0 };
  } catch (error) {
    console.error('[Rekognition] Échec de la comparaison de visages :', error);
    return { matched: false, similarity: 0 };
  }
}
