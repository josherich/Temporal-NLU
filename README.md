# Temporal-NLU

Generating synthetic data for training natural language inference models on target problems

### generate NER annotated corpus

node time.js generate training-data.1m.01.conll

### transform

train:
node time.js transform ./data/training-data.1m.01.conll_annotated.txt

dev:
node time.js transform dev ./data/training-data.1m.02.conll_annotated.txt

test:
node time.js transform test ./data/training-data.1m.02.conll_annotated.txt

genre(matched dev mix with Multinli):
node time.js transform genre ./data/training-data.1m.02.conll_annotated.txt

genre(mismatched dev mix with Multinli):
node time.js transform genre data/news-commentary-v6.en.conll_annotated.txt

### mix
snli test:
node time.js mix ./data/tnli_test.txt /Users/chenjosh/projects/jiant/data/SNLI/original/snli_1.0_test.txt test

multinli genre time:
node time.js mix ./data/tnli_genre.txt /Users/chenjosh/Documents/nli-dataset/multinli_0.9/multinli_0.9_dev_matched.txt genre


### evaluate on decomposable-attention-elmo
allennlp evaluate \
    https://s3-us-west-2.amazonaws.com/allennlp/models/decomposable-attention-elmo-2018.02.19.tar.gz \
    https://s3-us-west-2.amazonaws.com/allennlp/datasets/snli/snli_1.0_test.jsonl

### evaluate on kim

### evaluate on InferSent

s3://mindynode/tnli_test.jsonl

### evaludate multinli dev
python2 train_genre.py cbow petModel-cbow-2per --genre slate --emb_train --test