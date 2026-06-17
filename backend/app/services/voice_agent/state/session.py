class CallSession:
    def __init__(self):
        self.history = []
        self.turn = 0

    def next_turn(self):
        self.turn += 1
