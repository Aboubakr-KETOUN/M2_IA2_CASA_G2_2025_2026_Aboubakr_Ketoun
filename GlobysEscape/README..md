Bonjour,
Je m’appelle Aboubakr Ketoun, étudiant en Master 2 IA2.

Dans ce jeu, j’ai essayé d’appliquer l’ensemble des steering behaviors de Craig Reynolds que nous avons étudiés en cours. J’ai implémenté le code fourni par le professeur pour les steering behaviors, ainsi que pour l’algorithme génétique de neuro-évolution.

Le jeu comporte plusieurs niveaux, et chaque niveau ajoute de la complexité pour le joueur :

Niveau 1 : uniquement du seek. Le prédateur ne peut pas éviter les obstacles. Il y a un seul obstacle que le joueur ne peut pas toucher. On peut activer ou désactiver les boundaries avec la touche B. Le joueur peut tirer des flèches avec la touche S ou le clic gauche de la souris ; ces flèches utilisent également le comportement seek.

Niveau 2 : comportements arrive et wander, avec 2 obstacles et 2 prédateurs.

Niveau 3 : comportements pursue et avoid obstacles, avec 1 obstacle et 1 prédateur.

Niveau 4 : comportements pursue, avoid obstacles et separation, avec 3 obstacles et 3 prédateurs.

Niveau 5 : une petite phase d’entraînement sur des agents pendant 2 minutes à chaque fois. Les meilleurs sont sélectionnés pour passer au niveau suivant. Ils essaient de suivre le joueur à l’aide de leurs rays. Une fois l’entraînement terminé, les cerveaux sont sauvegardés dans le localStorage et utilisés comme boss dans le niveau 5.

Concernant les difficultés rencontrées, j’ai eu du mal à trouver les bons paramétrages des comportements des prédateurs. Le plus gros problème concernait les gènes des boss, car ils doivent suivre un joueur qui essaie de s’échapper. Cette logique n’était pas présente dans le code du professeur, donc j’ai essayé d’utiliser de l’IA pour trouver une solution, ce qui a pris beaucoup de temps. Malgré cela, j’ai finalement réussi à terminer le travail.

Le point du DNA est celui dont je suis le plus fier. Le jeu est basé sur l’un des jeux auxquels je jouais quand j’étais petit : The Binding of Isaac, notamment le personnage Guppy. Le personnage que j’utilise est aussi celui de mon portfolio (aboubakrketoun.codes). Ce personnage représente mon monde de développeur et mon rêve de devenir développeur de jeux vidéo.

Les outils d’IA que j’ai utilisés sont :

Antigravity avec le modèle Claude Opus 4.5 pour le code,

Nano Banana pour la génération des personnages et des images,

ChatGPT pour la création des fichiers de spécifications et de règles au début du projet, ainsi que pour le refinement de l’idée.