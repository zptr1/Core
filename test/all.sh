for file in "test"/*.core
do
  (./core $file > /dev/null 2>&1)
  echo ": $file"
  times
  echo "exit code $?\n"
done