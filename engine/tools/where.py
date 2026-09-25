"""
Where the engine is, and where the game it builds is, for the Python tools
(build.py has the same rule written into it).

The game is the folder that holds edition.jsonc:
  - the folder named in TESSERA_GAME, if set;
  - else the folder above the engine, when the engine sits inside a game
    as its engine/ folder;
  - else the engine's own folder, if it holds an edition.jsonc;
  - else the engine's example/ game, when the engine stands alone.
"""
import os

ENGINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def game_root(engine=ENGINE):
	if os.environ.get('TESSERA_GAME'):
		return os.path.abspath(os.environ['TESSERA_GAME'])
	above = os.path.dirname(engine)
	if os.path.basename(engine) == 'engine' and os.path.isfile(os.path.join(above, 'edition.jsonc')):
		return above
	if os.path.isfile(os.path.join(engine, 'edition.jsonc')):
		return engine
	return os.path.join(engine, 'example')


GAME = game_root()
