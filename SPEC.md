# Meylio — Spec produit (MVP)

## Concept

App de rencontre où le matching se fait d'abord sur la compatibilité musicale, pas sur l'apparence. Les utilisateurs voient les goûts musicaux d'un match potentiel avant sa photo. La photo n'est débloquée qu'après un match mutuel.

## Parcours utilisateur

1. **Inscription** — email/téléphone
2. **Connexion musicale** — choix entre :
   - connecter Spotify ou Apple Music (OAuth, récupération top artistes/genres/morceaux/audio features)
   - ou saisie manuelle des goûts (genres, artistes favoris)
3. **Ajout de photos** — plusieurs photos de profil (non visibles avant match, cf étape 5)
4. **Vérification par selfie** — confirmation que les photos correspondent à la personne (anti faux comptes)
5. **Découverte** — deux modes :
   - **Pool** : liste de profils compatibles indépendamment de la position
   - **Proximité** (opt-in, géoloc) : alerte quand une personne compatible est à proximité
6. **Profil pré-match** — affichage du score de compatibilité (détail : genres partagés, énergie/ambiance, artistes communs). **Pas de photo.**
7. **Match** — si like mutuel :
   - photo débloquée des deux côtés
   - playlist collaborative générée automatiquement (morceaux communs + complémentaires)
   - icebreaker généré automatiquement à partir des goûts communs
8. **Chat** — messagerie classique post-match

## Écrans (MVP)

- Onboarding (inscription)
- Connexion musicale (Spotify/Apple Music ou saisie manuelle)
- Ajout de photos
- Vérification par selfie
- Feed découverte (pool)
- Feed proximité (carte ou liste, opt-in géoloc)
- Écran profil pré-match (goûts + score, sans photo)
- Écran match (reveal photo + playlist + icebreaker)
- Chat
- Paramètres (gestion abonnement, géoloc, compte)
- Écran abonnement (freemium → premium)

## Modèle de données (haut niveau)

- **User** : id, email/tel, statut vérification, photos, préférences (âge, distance, genre recherché), géoloc opt-in, statut abonnement
- **MusicProfile** : user_id, source (spotify/apple/manuel), top_artists, top_genres, top_tracks, audio_features (énergie, valence, tempo moyen)
- **Match** : user_a_id, user_b_id, score_compatibilite (détail json), date_match, playlist_id, statut
- **Playlist** : match_id, liste de morceaux (générée à la création du match)
- **Message** : match_id, sender_id, contenu, timestamp
- **Report** : signalements/blocages entre utilisateurs (modération)

## Compatibilité musicale — logique de scoring

- Genres partagés (pondéré)
- Artistes communs
- Similarité des audio features (énergie, valence, tempo) via distance euclidienne ou cosine
- Score global normalisé en %, avec détail par catégorie affiché à l'utilisateur

## Monétisation

- Freemium : swipes/likes limités par jour, découverte pool uniquement
- Premium (abonnement) : swipes illimités, mode proximité, voir qui a liké, filtres avancés

## Sécurité & modération

- Vérification selfie obligatoire à l'inscription (comparaison avec photos de profil)
- Signalement et blocage utilisateur

## Stack technique

- **Mobile** : React Native (iOS + Android, un seul codebase)
- **Backend** : Node.js + PostgreSQL
- **Intégrations musicales** : Spotify Web API (OAuth + audio features), Apple Music API (v2)
- **Géolocalisation** : geofencing léger, pas de tracking GPS continu (contraintes Apple)
- **Landing page** : site web simple pour waitlist/lancement

## Roadmap post-MVP (v2)

- Évolution des goûts musicaux dans le temps (nécessite historique de données)
- Matching par événement/concert (intégration billetterie) — écarté du MVP
